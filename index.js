const CSSOM = require('cssom');
const computes = require('./computed');
const antdColorReplace = require('./antd-color-replace');
const { generate } = computes;
const settingFuncTemplate = require('./setting-func-template');

function ThemeReplacerPlugin(opt = {}) {
  this.props = opt;
}

ThemeReplacerPlugin.prototype.apply = function(compiler, callback) {
  compiler.plugin(
    'emit',
    function(compilation, callback) {
      function getFileType(name = '') {
        const fileType = name.substring(name.lastIndexOf('.') + 1, name.length).toLowerCase();
        return fileType;
      }
      // 对即将生成的文件进行处理
      let templateCss = '';
      const { theme = {}, template = {}, computed = [], antd } = this.props;
      // 找出动态计算后的class 加入模版映射对象
      const themeTemplate = { ...template };
      // antd 主题色关联处理
      if (antd && template['@primary-color']) {
        const primaryColors = generate(template['@primary-color']);
        primaryColors.forEach((color, index) => {
          if (typeof color === 'string') {
            themeTemplate[`<**${JSON.stringify({ insidePluginKey: 'generate', index })}*>`] = color;
          }
        });
      }
      [...antdColorReplace, ...computed].forEach(({ insidePluginKey, func, include = [] }) => {
        let validFunc = null;
        if (
          insidePluginKey &&
          computes[insidePluginKey] &&
          typeof computes[insidePluginKey] === 'function'
        ) {
          validFunc = computes[insidePluginKey];
        } else {
          if (func && typeof func === 'function') {
            validFunc = func;
          }
        }
        if (validFunc) {
          include.forEach(({ sourceKey, themeKey, params = [] }) => {
            let findValue = '';
            if (template[sourceKey]) {
              findValue = validFunc(template[sourceKey], ...params);
            }
            if (
              findValue &&
              typeof findValue === 'string' &&
              themeKey &&
              typeof themeKey === 'string'
            ) {
              themeTemplate[themeKey] = findValue;
            }
          });
        }
      });
      for (let filename in compilation.assets) {
        if (getFileType(filename) === 'css') {
          const source = compilation.assets[filename].source();
          const themeTemplateKeys = Object.keys(themeTemplate);
          let targetCss = '';
          // 如果编译出不合法css 则跳过此css文件
          try {
            targetCss = CSSOM.parse(source)
              .cssRules.filter(
                ({ cssText }) =>
                  themeTemplateKeys.filter(key => cssText.includes(themeTemplate[key])).length > 0,
              )
              .map(({ cssText, cssRules, style, selectorText }) => {
                let newCss = cssText;
                // 解决不需要关注的样式被提取出来只会产生污染问题
                // 单层css结构
                if (!cssRules) {
                  let matchStyles = '';
                  for (let i = 0; i < style.length; i++) {
                    const cssKey = style[i];
                    const cssValue = style[cssKey];
                    const findKey = themeTemplateKeys.find(key =>
                      cssValue.includes(themeTemplate[key]),
                    );
                    if (findKey) {
                      matchStyles += `${cssKey}: ${findKey}; `;
                    }
                  }
                  newCss = `${selectorText} { ${matchStyles} }`;
                } else {
                  // 嵌套css结构 类似@keyframes
                  themeTemplateKeys.forEach(key => {
                    newCss = newCss.split(themeTemplate[key]).join(key);
                  });
                }
                return newCss;
              })
              .join('\n');
          } catch (error) {
            console.error(`文件“${filename}”, 存在不合法css: \n${error}`);
          }
          templateCss += targetCss;
        }
      }
      const themeSetting = `
          ${settingFuncTemplate.head}
          theme: ${JSON.stringify(theme)},
          templateCss: ${JSON.stringify(templateCss)},
          generate: ${generate.toString()},
          ${settingFuncTemplate.bottom}
      `;

      if (compilation.assets['index.html']) {
        const indexSource = compilation.assets['index.html'].source();
        const addScript = '<script charset="utf-8" src="/theme-setting.js"></script>';
        if (!indexSource.includes(addScript)) {
          let htmlSource = indexSource.split('</head>').join(addScript + '</head>');

          compilation.assets['index.html'] = {
            source: function() {
              return htmlSource;
            },
            size: function() {
              return htmlSource.length;
            },
          };
        }
      }

      compilation.assets['theme-setting.js'] = {
        source: function() {
          return themeSetting;
        },
        size: function() {
          return themeSetting.length;
        },
      };

      // other codes
      callback();
    }.bind(this),
  );
};

module.exports = ThemeReplacerPlugin;
