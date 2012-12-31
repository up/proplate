/**
 * @license Copyright 2012 Uli Preuss.
 * https://github.com/up/proplate/blob/master/MIT-LICENSE.txt
 * v0.0.2 (2012-12-23)
*/

(function (window) {
  window['one'] = 'one'  ;
}(window));
window['one'] += 1;

function two() {
  return 'two';
}

var 
  three = two(),
  four = 4,
  five = null
;
alert(three);



