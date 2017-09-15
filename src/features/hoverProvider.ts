"use strict";
import {
  HoverProvider,
  MarkedString,
  Position,
  TextDocument,
  CancellationToken,
  Hover,
  Range,
  workspace
} from "vscode";
import * as cp from "child_process";
import { Utils } from "../utils/utils";

export default class PrologHoverProvider implements HoverProvider {
  // escape markdown syntax tokens: http://daringfireball.net/projects/markdown/syntax#backslash
  private textToMarkedString(text: string): MarkedString {
    return text.replace(/[\\`*_{}[\]()#+\-.!]/g, "\\$&");
  }
  public provideHover(
    doc: TextDocument,
    position: Position,
    token: CancellationToken
  ): Hover {
    let wordRange: Range = doc.getWordRangeAtPosition(position);
    if (!wordRange) {
      return;
    }
    let pred = Utils.getPredicateUnderCursor(doc, position);
    if (!pred) {
      return;
    }
    if (pred.arity < 0) {
      return;
    }
    let contents: MarkedString[] = [];
    switch (Utils.DIALECT) {
      case "swi":
        let modules: string[] = Utils.getPredModules(pred.pi);
        let desc = Utils.getPredDescriptions(pred.pi);
        if (desc !== "") {
          contents.push({ language: "prolog", value: desc });
        }
        if (modules.length > 0) {
          modules.forEach(module => {
            contents.push(module + ":" + pred.pi + "\n");
            let desc = Utils.getPredDescriptions(module + ":" + pred.pi);
            contents.push({ language: "prolog", value: desc });
          });
        }
        break;
      case "ecl":
        let pro = cp.spawnSync(Utils.RUNTIMEPATH, ["-e", `help(${pred.pi})`]);
        if (pro.status === 0) {
          contents.push({
            language: "prolog",
            value: pro.output
              .toString()
              .trim()
              .replace(/^\W*\n/, "")
              .replace(/\n{3,}/g, "\n\n")
              .replace(/  +/g, "  ")
          });
        } else {
          return;
        }
      default:
        break;
    }
    return contents === [] ? null : new Hover(contents, wordRange);
  }
}
