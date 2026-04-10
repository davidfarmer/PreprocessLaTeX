
export function deleteComments(str) {

   str = str.replace(/\s+%.*/g, "");  //  don't leave a blank line
   str = str.replace(/([^\\])%.*/g, "$1");  //  \% is a literal percent
   str = str.replace(/^%.*/, "");  // start of document

   return str
}

export function makeXMLSafe(str) {

   str = str.replace(/> */g, "\\gt ");
   str = str.replace(/< */g, "\\lt ");
   str = str.replace(/(\\(ref|eqref|cref|Cref|label){([^{}]+)})/g,  goodlabel);

   return str
}

export function timesShow(num) {
    if(num == 1) { return "1 time" }
    else { return num + " times" }
}

function goodlabel(match, offset, string) {
   let thelabel = match.replace(/.*{([^{}]+)}.*/,"$1");
   thelabel = thelabel.replace(/\s/g, "_");
   thelabel = thelabel.replace(/[^a-zA-Z0-9_]/g, "-");
   return  match.replace(/(.*{)([^{}]+)(}.*)/,"$1" + thelabel + "$3");
}

export function trimjunk(str) {

   str = str.replace(/\\begin +/g, "\\begin");
   str = str.replace(/\\chapter +/g, "\\chapter");
   str = str.replace(/\\section +/g, "\\section");
   str = str.replace(/\\section\*/g, "\\section");
   str = deleteComments(str);
   str = makeXMLSafe(str);
   str = str.replace(/\\end{document}.*/s, "");  // after deleting comments, in case an end was commented out
   str = str.replace(/^\s+/, "");
   str = str.replace(/\n{3,}/g, "\n\n");

   return str
}

export function firstBracketedString(text, depth = 0, lbrack = "{", rbrack = "}") {
  /**
   * If text is of the form {A}B, return {A},B.
   * Initial white space is stripped.
   *
   * Otherwise, return "",text.
   */

  let thetext = text.trimStart();

  if (!thetext) {
    console.warn("empty string sent to firstBracketedString()");
    return "";
  }

  let previouschar = "";
  var firstpart = "";
  // we need to keep track of the previous character because \{ does not
  // count as a bracket

  if (depth === 0 && thetext[0] !== lbrack) {
    return ["", thetext];
  } else if (depth === 0) {
//    let firstpart = lbrack;
    firstpart = lbrack;
    depth = 1;
    thetext = thetext.substring(1);
  } else {
 //   var firstpart = ""; // should be some number of brackets?
    firstpart = ""; // should be some number of brackets?
  }

  while (depth > 0 && thetext) {
    const currentchar = thetext[0];
    if (currentchar === lbrack && previouschar !== "\\") {
      depth += 1;
    } else if (currentchar === rbrack && previouschar !== "\\") {
      depth -= 1;
    }
    firstpart += currentchar;
    if (previouschar === "\\" && currentchar === "\\") {
      previouschar = "\n";
    } else {
      previouschar = currentchar;
    }

    thetext = thetext.substring(1);
  }

  if (depth === 0) {
    return [firstpart, thetext];
  } else {
    console.error("no matching bracket %s in %s XX", lbrack, thetext);
    return ["", firstpart.substring(1)]; // firstpart should be everything
    // but take away the bracket that doesn't match
  }
}

