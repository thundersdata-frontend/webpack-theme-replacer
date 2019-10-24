module.exports = {
  head: `
  ; (function () {
    "use strict"
    var _global;
    
    var themeSetting = {
  `,
  bottom: `
  change: function (key, config) {
    try {
        var newTheme = {};
        var generate = this.generate;
        if(key && typeof key === 'string') {
            var currentTheme = this.theme[key] || {};
            newTheme = currentTheme.config || {};
        }
        var newConfig = config || {};
        for(var addKey in newConfig) {
            newTheme[addKey] = newConfig[addKey];
        }
        var generateTemplateCss = this.templateCss || '';
        var primaryColor = newTheme['@primary-color'];
        var newTemplateCss = generateTemplateCss.split('*>').map(function (cssStr){
          var newCss = cssStr;
          if(newCss.includes('<**')) {
            var jsonStr = newCss.split('<**')[1];
            var parseRule = JSON.parse(jsonStr);
            if(parseRule.insidePluginKey === 'generate' && primaryColor){
              newCss = newCss.split('<**' + jsonStr).join(generate(primaryColor)[parseRule.index])
            }
          }
          return newCss;
        }).join('');
        for(var themeKey in newTheme) {
            newTemplateCss = newTemplateCss.replace(new RegExp(themeKey, 'g'), newTheme[themeKey]);
        }
        var styleDom = document.getElementById('theme-config');
        if(styleDom) {
            styleDom.innerHTML = newTemplateCss;
        } else {
            styleDom = document.createElement('style');
            styleDom.id = 'theme-config';
            styleDom.innerHTML = newTemplateCss;
            document.body.appendChild(styleDom);
        }
    } catch(error) {
        console.error(error);
    }
},
init: function (){
    var _this = this;
    if(!document.getElementById('theme-config')){
        var initCheck = setInterval(function (){
            if(!document.getElementById('theme-config')){
              if(document.body){
                _this.change('default');
              }
            } else {
                clearInterval(initCheck);
            }
        }, 50)
    }
},
};

themeSetting.init();

_global = (function () { return this || (0, eval)('this'); }());
if (typeof module !== "undefined" && module.exports) {
module.exports = themeSetting;
} else if (typeof define === "function" && define.amd) {
define(function () { return themeSetting; });
} else {
!('themeSetting' in _global) && (_global.themeSetting = themeSetting);
}
}());
  `,
};
