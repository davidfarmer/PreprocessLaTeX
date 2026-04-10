
import {issuesDictionary} from './main.js'
import {timesShow} from './utils.js'

try {
    const anomalyStatus = document.getElementById('anomalyStatus');
} catch {
    //  pass  // page does not have a place to report that information
}

// import {deleteComments, makeSafe} from './utils.js'
import {badPlainTeX, badPlainTeXdirectives, specialBadMacros, eliminateAndSave, badEverywhereMacros, publisherOptions, badEverywhereMacrosLine, badEverywhereMacrosPlus, badBodyEnvironments, alternatives} from './data.js'

export function scanForAnomalies(str) {

   let basicerrors = [];

   let preambleBodyBiblio = separatePieces(str);

   let preamble = preambleBodyBiblio[0];
   let maintext = preambleBodyBiblio[1];
   let bibliography = preambleBodyBiblio[2];

// console.log("maintext 1", maintext.substring(1,40));

   for(const lookfor of badEverywhereMacros) {
//console.log(lookfor);
      preamble = noPlainTeX(preamble, lookfor,"", "delete", "");
      maintext = noPlainTeX(maintext, lookfor,"", "delete", "");
   }
   for(const lookfor of specialBadMacros){
      preamble = noPlainTeX(preamble, lookfor,"line", "delete", "in the preamble", "save");
      maintext = noPlainTeX(maintext, lookfor,"line", "delete", "in the main text", "save")
}
   for(const lookfor of eliminateAndSave){
      preamble = noPlainTeX(preamble, lookfor,"line", "delete", "in the preamble", "save");
      maintext = noPlainTeX(maintext, lookfor,"line", "delete", "in the main text", "save")
}

// console.log("maintext 2", maintext.substring(1,40));

   for(const lookfor of badEverywhereMacrosPlus) {
//console.log(lookfor);
      preamble = noPlainTeX(preamble, lookfor,"hasarg","delete");
      maintext = noPlainTeX(maintext, lookfor,"hasarg","delete")
   }
   for(const lookfor of badEverywhereMacrosLine) {
      preamble = noPlainTeX(preamble, lookfor,"line", "delete","");
      maintext = noPlainTeX(maintext, lookfor,"line", "delete","")
   }
   for(const lookfor of publisherOptions) {
      preamble = noPlainTeX(preamble, lookfor,"line", "delete"," -- this is a publisher choice in PreTeXt");
      maintext = noPlainTeX(maintext, lookfor,"line", "delete"," -- this is a publisher choice in PreTeXt")
   }

// console.log("maintext 3", maintext.substring(1,40));

   for(const lookfor of badPlainTeX) {
      maintext = noPlainTeX(maintext, lookfor)
   }

   for(const lookfor of badBodyEnvironments) {
      maintext = noBadEnvironments(maintext, lookfor, "env", "delete")
   }

//   console.log("maintext",maintext);

   return preamble + "\\begin{document}\n" + maintext + "\\begin{thebibliography}\n" + bibliography

}

export function separatePieces(str) {

   let twopieces = str.split("\\begin{document}");

   if(twopieces.length < 2) {
      console.error("missing begin{document} ? " + twopieces.length);
   } else if(twopieces.length > 2) {
      // bug somewhere, where material is duplicated
      console.error("extra begin{document} ? " + twopieces.length + " pieces, probably a harmless bug");
   }
   const thepreamble = twopieces[0];
   let thebody = twopieces[1];

   let thebiblio = "";

   if(thebody.match(/begin{thebibliography}/)) {

      const bodyandbiblio = thebody.split("\\begin{thebibliography}");
      thebody = bodyandbiblio[0];
      thebiblio = bodyandbiblio[1]
   }

   return [thepreamble,thebody,thebiblio]
}

function noBadEnvironments(str, lookingFor,env="",action="", extra="") {

   const thesetagsName = lookingFor[0];
   const thesetagsType = lookingFor[1];
   for(const lookfor of lookingFor[2]) {

      const re = new RegExp("(\\\\(begin|end){\\s*" + lookfor + "})", 'g');

      if(str.match(re)) {

   //       allErrors.push(["error", thesetagsType, lookfor]);

        if(action=="delete") {
    showDeleteStatus(thesetagsName, lookfor, str.match(re).length, extra);
          str = str.replace(re, "");
      } else {
          str = str.replace(re, '<span tabindex="0" data-macro="' + lookfor + '" class="error ' + lookfor + '" onclick="addEditMenuTo(this)">$1</span>');
    showAnomalyStatus(thesetagsName, thesetagsType, lookfor);
      }
      }
   }

   return str
}

function noPlainTeX(str, lookingFor, type="", action="", extra="",save="") {

//console.log(lookingFor);
   const thesetagsType = lookingFor[0];
   const thesetagsName = lookingFor[1];
   for (const lookfor of lookingFor[2]) {
  //    const thesetagsOr = lookingFor[1].join("|");
  //    console.log("checking ",lookfor);
      var lookforname;
      if(typeof lookfor === 'string') { lookforname = lookfor }
      else { lookforname = lookfor[0] }

      let re = new RegExp("(\\\\(" + lookforname + ")\\b)", 'g');
//console.log("             Q         re",lookforname,"Q",re);

      if(type=="hasarg") {
          let researchstring = "(\\\\(" + lookforname + ")\\b\\*?";
          for(let i=0; i < lookfor[1]; ++i) {
             researchstring += "{[^{}]*}"
          }
          researchstring += ")";
          re = new RegExp(researchstring, 'g');
//console.log("                      re",lookforname,"P",re);
      }

      if(type=="line") {
          re = new RegExp("(\\\\(" + lookforname + ")\\b.*)", 'g');
      }

      if(str.match(re)) {

//          allErrors.push(["error", thesetagsType , lookforname]);
          if(save) {
// console.log(type, "X", re);
            showSaved(thesetagsType, lookforname, str.match(re), extra);
          }

          if(action == "delete") {
            showDeleteStatus(thesetagsType, lookforname, str.match(re).length, extra);
            str = str.replace(re, "");
          } else {
            showAnomalyStatus(thesetagsType, thesetagsName, lookfor);
            str = str.replace(re, '<span tabindex="0" data-macro="' + lookforname + '" ' +  'class="error' + ' ' + thesetagsType + ' ' + lookforname + '">$1</span>');
          }
      }

   }

//console.log(str.slice(1,50));
   return str
}


function showAnomalyStatus(err0, err1, err2) {

   var thisdefaultMsg = "ignore";
   if(err2 in alternatives) { thisdefaultMsg = alternatives[err2][0][0] }
   issuesDictionary["ambiguous"]["value"].push([err2, thisdefaultMsg]);

   try {
   document.getElementById('anomalySection').className = `show status`;

   var thiserrWrapper = document.createElement('div');
   thiserrWrapper.className = "error";
   let thiserr = '<span class="oldmarkup ' + err0 + ' ' + 'root' +  err2 + ' ' + err1  + '">' + err2 + '</span>';

   var thisdefault = "<em>delete</em>";
   if(err2 in alternatives) { thisdefault = alternatives[err2][0][0] }

   thiserr += '<span class="default">' + thisdefault + '</span>';

    thiserr += ' <span onclick="scrollToClass(' + "'" + err2 + "',0" + ')">first</span>' + ' ... ' + '<span onclick="scrollToClass(' + "'" + err2 + "',-1" + ')">last example</span>' +  '\n' ;
   thiserrWrapper.innerHTML = thiserr;
   anomalyStatus.appendChild(thiserrWrapper);
   } catch {
      //  pass  // page does not have a place to report that information
   }
}

function showDeleteStatus(type, substitution, num, extra="") {
   let message = substitution;
   message += " " + timesShow(num) + " " + extra + "\n";
   issuesDictionary["deleted"]["value"] += message;
   try {
     document.getElementById('deletedSection').className = `show status`;
     deletedStatus.textContent += message;
   } catch {
      //  pass  // page does not have a place to report that information
   }
}

function showSaved(type, substitution, defn, extra="") {
   let message = "";  //substitution;
   for(const def of defn) {
     message += def + "\n";
   }
   issuesDictionary["badmacros"]["value"] += message;

   try {
     document.getElementById('savedSection').className = `show status`;
     savedStatus.textContent += message;
   } catch {
      //  pass  // page does not have a place to report that information
   }
}

