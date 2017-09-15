import {
  CancellationToken,
  DefinitionProvider,
  Location,
  Position,
  Range,
  TextDocument,
  Uri,
  workspace
} from "vscode";
import * as cp from "child_process";
import * as jsesc from "jsesc";
import { Utils } from "../utils/utils";

export class PrologDefinitionProvider implements DefinitionProvider {
  public provideDefinition(
    doc: TextDocument,
    position: Position,
    token: CancellationToken
  ): Location | Thenable<Location> {
    let location: Location = null;
    let pred = Utils.getPredicateUnderCursor(doc, position);
    if (!pred) {
      return null;
    }

    let exec = Utils.RUNTIMEPATH;
    let args: string[] = [],
      prologCode: string,
      result: string[],
      predToFind: string;

    switch (Utils.DIALECT) {
      case "swi":
        args = ["-q", doc.fileName];
        prologCode = `
        source_location:-
          read(Term),
          current_module(Module),
          predicate_property(Module:Term, file(File)),
          predicate_property(Module:Term, line_count(Line)),
          format("File:~s;Line:~d~n", [File, Line]).
          `;
        predToFind = pred.wholePred;
        break;

      case "ecl":
        args = ["-f", doc.fileName];
        prologCode = `
        source_location:-
          read(Term),
          get_flag(Term, source_file, File),
          get_flag(Term, source_line, Line),
          printf("File:%s;Line:%d%n", [File, Line]).
        `;
        predToFind = pred.pi;
        break;

      default:
        break;
    }

    if (doc.isDirty) {
      doc.save().then(_ => {
        result = Utils.execPrologSync(
          args,
          prologCode,
          "source_location",
          predToFind,
          /File:(.+);Line:(\d+)/
        );
      });
    } else {
      result = Utils.execPrologSync(
        args,
        prologCode,
        "source_location",
        predToFind,
        /File:(.+);Line:(\d+)/
      );
    }

    if (result) {
      let fileName: string = result[1];
      let lineNum: number = parseInt(result[2]);
      location = new Location(Uri.file(fileName), new Position(lineNum - 1, 0));
    }

    return location;
  }
}
