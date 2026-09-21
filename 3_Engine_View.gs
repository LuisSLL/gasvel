/**
 * 3_Engine_View.gs
 * Motor de renderizado con soporte para Layouts
 */
class View {

  static render(viewName, data = {}, layoutName = 'Layout_Main') {

    const view = HtmlService.createTemplateFromFile('View_' + viewName);
    Object.assign(view, data); 
    view.scriptUrl = ScriptApp.getService().getUrl();
    
    const childContent = view.evaluate().getContent();

    const layout = HtmlService.createTemplateFromFile('View_' + layoutName);
    Object.assign(layout, data);

    layout.content = childContent;
    layout.title = data.title || 'GASVEL';
    layout.scriptUrl = ScriptApp.getService().getUrl();
    layout.theme = typeof getTheme === 'function' ? getTheme() : 'light';

    return layout.evaluate()
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
}
