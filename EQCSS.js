/*
 * EQCSS / Tommy Hodgins, Maxime Euzière / MIT licence
 */

EQCSS = {
  data: []
}

/*
 * EQCSS.load()
 * Called automatically on page load.
 * Call it manually after adding EQCSS code in the page.
 * Loads and parses all the EQCSS code.
 */

EQCSS.load = function(){

  // Retrieve all style blocks
  var styles = document.querySelectorAll("style");

  for(var i = 0; i < styles.length; i++){
    
    // Test if the style is not read yet
    if(styles[i].getAttribute("data-eqcss-read") === null){
    
      // Mark the style block as read
      styles[i].setAttribute("data-eqcss-read", "true");
      
      // Process
      EQCSS.parse(styles[i].innerHTML);
      EQCSS.apply();
    }
  }
  
  // Retrieve all script blocks
  styles = document.querySelectorAll("script");

  for(var i = 0; i < styles.length; i++){
    
    // Test if the script is not read yet and has type="text/eqcss"
    if(styles[i].getAttribute("data-eqcss-read") === null && styles[i].getAttribute("type") === "text/eqcss"){
      
      // Test if they contain external EQCSS code
      if(styles[i].src){

        // retrieve the file content with AJAX and process it
        (function(){
          var xhr = new XMLHttpRequest;
          xhr.open("GET", styles[i].src, true);                             
          xhr.send(null);
          xhr.onload = function(){
            EQCSS.parse(xhr.responseText);
            EQCSS.apply();
          }
        })();
      }
      
      // or embedded EQCSS code
      else {
        
        // Process
        EQCSS.parse(styles[i].innerHTML);
        EQCSS.apply();
      }
    
      // Mark the script block as read
      styles[i].setAttribute("data-eqcss-read", "true");
    }
  }
  
  // Retrieve all link tags
  styles = document.querySelectorAll("link");

  for(i = 0; i < styles.length; i++){
    
    // Test if the link is not read yet, and has rel=stylesheet
    if(styles[i].getAttribute("data-eqcss-read") === null && styles[i].getAttribute("rel") == "stylesheet"){
        
      // retrieve the file content with AJAX and process it
      if(styles[i].href){
        (function(){
          var xhr = new XMLHttpRequest;
          xhr.open("GET", styles[i].href, true);                             
          xhr.send(null);
          xhr.onload = function(){
            EQCSS.parse(xhr.responseText);
            EQCSS.apply();
          }
        })();               
      }
      
      // Mark the link as read
      styles[i].setAttribute("data-eqcss-read", "true");
    }
  }
}

/*
 * EQCSS.parse()
 * Called by load for each script / style / link resource.
 * Generates data for each Element Query found
 */
EQCSS.parse = function(code){
  
  // Cleanup
  code = code.replace(/\s+/g," "); // reduce spaces
  code = code.replace(/\/\*[\w\W]*?\*\//g,""); // remove comments
  code = code.replace(/(@element.*?\{([^}]*?\{[^}]*?\}[^}]*?)*\}).*/gm, "$1"); // Keep the queries only (discard regular css written around them)
  
  // Parse
  
  // For each query
  code.replace(/(@element.*(?!@element))/g, function(string, query){
    
    // Create a data entry
    dataEntry = { };
    
    // Extract the selector
    query.replace(/@element ?["']([^"']*)["']/g, function(string, selector){
        dataEntry.selector = selector;
    })

    // Extract the conditions (measure, value, unit)
    dataEntry.conditions = [];
    query.replace(/and ?\( ?([^:]*) ?: ?([^)]*) ?\)/g, function(string, measure, value){
        
      // Separate value and unit if it's possible
      var unit = null;
      unit = value.replace(/^\d+(\D+)$/, "$1");
      if(unit == value){
        unit = null;
      }
      value = value.replace(/^(\d+)\D+$/, "$1");
      dataEntry.conditions.push({measure: measure, value: value, unit: unit});
    });

    // Extract the styles
    query.replace(/{(.*)}/g, function(string, style){
       dataEntry.style = style;
    });
    
    // Add it to data
    EQCSS.data.push(dataEntry);
    
  });
}

/*
 * EQCSS.apply()
 * Called on load, on resize and manually on DOM update
 * Enable the Element Queries in which the conditions are true
 */

EQCSS.apply = function(){
    
  //l(EQCSS.data);

  var i, j, k;                      // Iterators
  var elements;                     // Elements targeted by each query
  var element_guid;                 // GUID for current element
  var css_block;                    // CSS block corresponding to each targeted element
  var element_guid_parent;          // GUID for current element's parent
  var css_code;                     // CSS code to write in each CSS block (one per targeted element)
  var element_width, parent_width;  // Computed widths
  var element_height, parent_height;// Computed heights
  var element_line_height;          // Computed line-height
  var test;                         // Query's condition test result
  var computed_style;               // Each targeted element's computed style
  var parent_computed_style;        // Each targeted element parent's computed style
  
  // Loop on all element queries
  for(i = 0; i < EQCSS.data.length; i++){
  
    // Find all the elements targeted by the query
    elements = document.querySelectorAll(EQCSS.data[i].selector);
    
    // Loop on all the elements
    for(j = 0; j < elements.length; j++){
    
      // Create a guid for this element
      // Pattern: "EQCSS_{element-query-index}_{matched-element-index}"
      element_guid = "data-eqcss-" + i + "-" + j;
      
      // Add this guid as an attribute to the element 
      elements[j].setAttribute(element_guid, "");
      
      // Create a guid for the parent of this element
      // Pattern: "EQCSS_{element-query-index}_{matched-element-index}_parent"
      element_guid_parent = "data-eqcss-" + i + "-" + j + "-parent";
      
      // Add this guid as an attribute to the element's parent (except if element is the root element)
      if(elements[j] != document.documentElement){
        elements[j].parentNode.setAttribute(element_guid_parent, "");
      }
      
      // Get the CSS block associated to this element (or create one in the <HEAD> if it doesn't exist)
      css_block = document.querySelector("#" + element_guid);
      if(!css_block){
        css_block = document.createElement("STYLE");
        css_block.id = element_guid;
        css_block.setAttribute("data-eqcss-read", "true");
        document.querySelector("head").appendChild(css_block);
      }
      css_block = document.querySelector("#" + element_guid);
      
      // Reset the query test's result (first, we assume that the selector is matched)
      test = true;
      
      // Loop on the conditions
      test_conditions: for(k = 0; k < EQCSS.data[i].conditions.length; k++){
        
        // Reuse element and parent's computed style instead of computing it everywhere 
        computed_style = window.getComputedStyle(elements[j], null);
        
        parent_computed_style = null;
        if(elements[j] != document.documentElement){
          parent_computed_style = window.getComputedStyle(elements[j].parentNode, null);
        }
        
        // If the condition's unit is set and is not px or %, convert it into pixels
        if(EQCSS.data[i].conditions[k].unit != ""
        && EQCSS.data[i].conditions[k].unit != "px"
        && EQCSS.data[i].conditions[k].unit != "%")
        {
          // Create a hidden DIV, sibling of the current element (or its child, if the element is <html>)
          // Set the given measure and unit to the DIV's width
          // Measure the DIV's width in px
          // Remove the DIV
          var div = document.createElement('DIV');
          div.style.visibility = 'hidden';
          div.style.width = EQCSS.data[i].conditions[k].value + EQCSS.data[i].conditions[k].width;
          var position = elements[j];
          if(elements[j] != document.documentElement){
            position = elements[j].parentNode;
          }
          position.appendChild(div);
          EQCSS.data[i].conditions[k].value = parseInt(window.getComputedStyle(div, null).getPropertyValue('width'));
          EQCSS.data[i].conditions[k].unit = "px";
          position.removeChild(div);
        }
        
        // Check each condition for this query and this element
        // If at least one condition is false, the element selector is not matched
        switch(EQCSS.data[i].conditions[k].measure){
        
          // Min-width 
          case "min-width":
          
            // Min-width in px
            if(EQCSS.data[i].conditions[k].unit == "px"){
              element_width = parseInt(computed_style.getPropertyValue("width"));
              if(!(element_width >= parseInt(EQCSS.data[i].conditions[k].value))){
                test = false;
                break test_conditions;
              }
            }
          
            // Min-width in %
            if(EQCSS.data[i].conditions[k].unit == "%"){
              element_width = parseInt(computed_style.getPropertyValue("width"));
              parent_width = parseInt(parent_computed_style.getPropertyValue("width"));
              if(!(parent_width / element_width <= 100 / parseInt(EQCSS.data[i].conditions[k].value))){
                test = false;
                break test_conditions;
              }
            }
            
          break;
          
          // Max-width
          case "max-width":
          
            // Max-width in px
            if(EQCSS.data[i].conditions[k].unit == "px"){
              element_width = parseInt(computed_style.getPropertyValue("width"));
              if(!(element_width <= parseInt(EQCSS.data[i].conditions[k].value))){
                test = false;
                break test_conditions;
              }
            }
          
            // Max-width in %
            if(EQCSS.data[i].conditions[k].unit == "%"){
              element_width = parseInt(computed_style.getPropertyValue("width"));
              parent_width = parseInt(parent_computed_style.getPropertyValue("width"));
              if(!(parent_width / element_width >= 100 / parseInt(EQCSS.data[i].conditions[k].value))){
                test = false;
                break test_conditions;
              }
            }
          
          break;
          
          // Min-height 
          case "min-height":
          
            // Min-height in px
            if(EQCSS.data[i].conditions[k].unit == "px"){
              element_width = parseInt(computed_style.getPropertyValue("height"));
              if(!(element_width >= parseInt(EQCSS.data[i].conditions[k].value))){
                test = false;
                break test_conditions;
              }
            }
          
            // Min-height in %
            if(EQCSS.data[i].conditions[k].unit == "%"){
              element_width = parseInt(computed_style.getPropertyValue("height"));
              parent_width = parseInt(parent_computed_style.getPropertyValue("height"));
              if(!(parent_width / element_width <= 100 / parseInt(EQCSS.data[i].conditions[k].value))){
                test = false;
                break test_conditions;
              }
            }
            
          break;
          
          // Max-height
          case "max-height":
          
            // Max-height in px
            if(EQCSS.data[i].conditions[k].unit == "px"){
              element_height = parseInt(computed_style.getPropertyValue("height"));
              if(!(element_height <= parseInt(EQCSS.data[i].conditions[k].value))){
                test = false;
                break test_conditions;
              }
            }
          
            // Max-height in %
            if(EQCSS.data[i].conditions[k].unit == "%"){
              element_height = parseInt(computed_style.getPropertyValue("height"));
              parent_height = parseInt(parent_computed_style.getPropertyValue("height"));
              if(!(parent_height / element_height >= 100 / parseInt(EQCSS.data[i].conditions[k].value))){
                test = false;
                break test_conditions;
              }
            }
          
          break;
          
          // Min-characters 
          case "min-characters":
          
            // form inputs
            if(elements[j].value){
              if(!(elements[j].value.length >= parseInt(EQCSS.data[i].conditions[k].value))){
                test = false;
                break test_conditions;
              }
            }
            
            // blocks
            else{
            
              if(!(elements[j].textContent.length >= parseInt(EQCSS.data[i].conditions[k].value))){
                test = false;
                break test_conditions;
              }
            
            }
            
          break;
          
          // Max-characters
          case "max-characters":
            
            // form inputs
            if(elements[j].value){
              if(!(elements[j].value.length <= parseInt(EQCSS.data[i].conditions[k].value))){
                test = false;
                break test_conditions;
              }
            }
            
            // blocks
            else{
            
              if(!(elements[j].textContent.length <= parseInt(EQCSS.data[i].conditions[k].value))){
                test = false;
                break test_conditions;
              }
            
            }
          
          break;
          
          
          // Min-children 
          case "min-children":
          
            if(!(elements[j].children.length >= parseInt(EQCSS.data[i].conditions[k].value))){
              test = false;
              break test_conditions;
            }
            
          break;
          
          // Max-children
          case "max-children":
          
            if(!(elements[j].children.length <= parseInt(EQCSS.data[i].conditions[k].value))){
              test = false;
              break test_conditions;
            }
          
          break;
          
          
          
          // Min-lines 
          case "min-lines":

            element_height = 
              parseInt(computed_style.getPropertyValue("height"))
              - parseInt(computed_style.getPropertyValue("border-top-width"))
              - parseInt(computed_style.getPropertyValue("border-bottom-width"))
              - parseInt(computed_style.getPropertyValue("padding-top"))
              - parseInt(computed_style.getPropertyValue("padding-bottom"))
            
            element_line_height = parseInt(computed_style.getPropertyValue("line-height"));
              
            if(!(element_height / element_line_height >= parseInt(EQCSS.data[i].conditions[k].value))){
              test = false;
              break test_conditions;
            }
            
          break;
          
          // Max-lines
          case "max-lines":
          
            element_height = 
              parseInt(computed_style.getPropertyValue("height"))
              - parseInt(computed_style.getPropertyValue("border-top-width"))
              - parseInt(computed_style.getPropertyValue("border-bottom-width"))
              - parseInt(computed_style.getPropertyValue("padding-top"))
              - parseInt(computed_style.getPropertyValue("padding-bottom"))

            element_line_height = parseInt(computed_style.getPropertyValue("line-height"));
              
            if(!(element_height / element_line_height + 1 <= parseInt(EQCSS.data[i].conditions[k].value))){
              test = false;
              break test_conditions;
            }
          
          break;

        }
      }
      

      // Update CSS block:
      // If all conditions are met: copy the CSS code from the query to the corresponding CSS block
      if(test === true){

        // Get the CSS code to apply to the element
        css_code = EQCSS.data[i].style;
        
        // Replace "$this" with "[element_guid]"
        css_code = css_code.replace(/\$this/g, "[" + element_guid + "]");
        
        // Replace "$parent" with "[element_guid_parent]"
        css_code = css_code.replace(/\$parent/g, "[" + element_guid_parent + "]");
        
        // Replace "$root" with html
        css_code = css_code.replace(/\$root/g, "html");
        
        // good browsers
        try {
          css_block.innerHTML = css_code;
        }
        
        // IE8
        catch(e){
          css_block.styleSheet.cssText = css_code;
        }
      }
      
      // If condition is not met: empty the CSS block
      else {
        
        // Good browsers
        try{
          css_block.innerHTML = "";
        }
        
        // IE8
        catch(e){
          css_block.styleSheet.cssText = "";
        }
      }
    }
  }
}

/*
 * "DOM Ready" cross-browser polyfill / Diego Perini / MIT license
 * Forked from: https://github.com/dperini/ContentLoaded/blob/master/src/contentloaded.js
 */
EQCSS.domReady = function(fn) {

  var done = false, top = true,

  doc = window.document,
  root = doc.documentElement,
  modern = !~navigator.userAgent.indexOf("MSIE 8"),

  add = modern ? 'addEventListener' : 'attachEvent',
  rem = modern ? 'removeEventListener' : 'detachEvent',
  pre = modern ? '' : 'on',

  init = function(e) {
    if (e.type == 'readystatechange' && doc.readyState != 'complete') return;
    (e.type == 'load' ? window : doc)[rem](pre + e.type, init, false);
    if (!done && (done = true)) fn.call(window, e.type || e);
  },

  poll = function() {
    try { root.doScroll('left'); } catch(e) { setTimeout(poll, 50); return; }
    init('poll');
  };

  if (doc.readyState == 'complete') fn.call(window, 'lazy');
  else {
    if (!modern && root.doScroll) {
      try { top = !window.frameElement; } catch(e) { }
      if (top) poll();
    }
    doc[add](pre + 'DOMContentLoaded', init, false);
    doc[add](pre + 'readystatechange', init, false);
    window[add](pre + 'load', init, false);
  }
}

// Call load and apply on page load
EQCSS.domReady(function(){
  EQCSS.load();
  EQCSS.apply();
});

// Call apply on resize
window.addEventListener("resize", function(){
  EQCSS.apply();
});

// Debug: here's a shortcut for console.log
function l(a){console.log(a)}