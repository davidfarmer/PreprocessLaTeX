
// =========== editing  ========

let editorLog = console.log;
var prev_prev_char = "";
var prev_char = "";
var this_char = "";

document.addEventListener('keydown', logKeyDown);

function logKeyDown(e) {
    if (e.code == "ShiftLeft" || e.code == "ShiftRight" || e.code == "Shift") { return }
    prev_prev_char = prev_char;
    prev_char = this_char;
    this_char = e;
    editorLog("logKey",e,"XXX",e.code);
    editorLog("are we editing", document.getElementById('actively_editing'));
    editorLog("is there already an edit menu?", document.getElementById('edit_menu_holder'));

    var themenu =  document.getElementById('edit_menu_holder');
    var input_region = document.activeElement;
    editorLog("input_region", input_region);

    if (e.code == "Enter" && themenu) {
       document.activeElement.click();
       console.log("clicked:", document.activeElement)
    } else if (e.code == "Enter") {
       console.log("adding menu")
       addEditMenuTo(input_region);
    }
    if (e.code == "Tab" && themenu) {
       e.preventDefault();
       let thismenuitem = document.activeElement;
       if(thismenuitem.nextElementSibling) { thismenuitem.nextElementSibling.focus() }
       else { thismenuitem.parentElement.children[0].focus() }
       console.log("moved to:", document.activeElement)
    }
}

function wrapq(str) {
   return "'" + str + "'"
}

function addEditMenuTo(elem) {
   let theseclasses = elem.className;
   console.log("element has classes:", theseclasses);
   let toreplace = elem.getAttribute("data-macro");

   var options = [];
   if(toreplace in alternatives) {
      options = alternatives[toreplace];
   }
//   let options = ["textit", [["emph","emphasis"], ["term","terminology"]]];
//   let toreplace = options[0];

   var innermenu = '<span class="option" tabindex="0" onClick="closemenu()">Leave as-is (will be ignored later)</span>';
   innermenu += '<span class="option" tabindex="0"  onClick="replacetex(' + wrapq(toreplace) + ',0' + ',0)">Delete</span>';
   innermenu += '<span class="option" tabindex="0"  onClick="replacetex(' + wrapq(toreplace) + ',-1' + ',-1)">Delete everywhere</span>';
  for(const optionpair of options) {
      var thisoption = '<span onClick="replacetex(' + wrapq(toreplace) + "," + "'" + optionpair[0]+ "'" + ',1)" tabindex="0"  class="option">';
      thisoption +=  optionpair[1]
      thisoption +=  '</span>';
      thisoption +=  '<span onClick="replacetex('  + wrapq(toreplace) + ","+ wrapq(optionpair[0]) + ',1000)" tabindex="0"  class="option">';
      thisoption +=  optionpair[1] + ' (replace everywhere)';
      thisoption +=  '</span>';
   
      innermenu += thisoption   
   }
   let edit_menu = document.createElement('span');
   edit_menu.setAttribute("id", "edit_menu_holder");
   edit_menu.innerHTML = innermenu;
   elem.appendChild(edit_menu);
   document.getElementById('edit_menu_holder').firstChild.focus();
console.log("active now:",document.activeElement);
}

