'use strict';
function Pages(db, parentPath="pages", runFunctionsKit=null) {

  const defaultTemplate = (data)=>{
    return `<!DOCTYPE html><title>${data.title}</title>${data.content}`;
  }

  const getMenu = async () => {
    return await db.path(parentPath).path('menu').get().then(result=>{
      return result.data || {};
    }).catch(err=>{return {};});
  };

  const getTemplate = async (templateName) => {
    if (!templateName) {
      return null;
    }
    return await db.path(parentPath).path('templates').path(templateName).get().then(result=>{
      if (!result.data || !result.data.content) {
        return null;
      }
      let dynamicTemplate = new Function('return ' + result.data.content||'' + ';')();
      if (typeof dynamicTemplate === 'function') {
        return dynamicTemplate;
      } else {
        return null;
      }
    }).catch(err=>{
      return null;
    });
  };

  const getHTML = (template, data) => {
    let result = template({
      "title":data.title||'',
      "description":data.description||'',
      "pubdate":data.pubdate||'',
      "photo":data.photo||'',
      "above":data.above||'',
      "menu":data.menu||'',
      "content":data.content||'',
      "below":data.below||'',
      "redirect":data.redirect||'',
      "template":data.template||''
    });
    return result;
  };

  const isTextTypeFile = (value='',accepted=['txt','json','js','css']) => {
    let ext = value.toString().split('.').slice(-1)[0].toLocaleLowerCase();
    return accepted.includes(ext) ? ext : false;
  }

  const getContentType = (extention) => {
    if (extention === 'txt') {
      return "text/plain";
    }
    if (extention === 'json') {
      return "application/json";
    }
    if (extention === 'js') {
      return "application/javascript";
    }
    if (extention === 'css') {
      return "text/css";
    }
    return false;
  };

  const runCode = async (req, res, code, kit) => {
    let func = new Function('req', 'res', 'kit', 'return' + '(' + code + ')(req, res, kit)');
    return await func(req, res, kit);
  };

  const route = () => {
    return async (req, res, next) => {
      let exists = null;
      if (db.path(req.path).parse().path === '/') {
        exists = await db.path(parentPath).path('pages').path('home').get().catch(err=>{return null;});
      } else {
        if (runFunctionsKit) {
          exists = await db.path(parentPath).path('functions').path(req.path).get().catch(err=>{return null;});
        }
        if (exists && exists.data && exists.data.content) {
          return runCode(req, res, exists.data.content, runFunctionsKit).then(result=>{
            res.json(result);
          }).catch(err=>{
            res.status(err.code||400).json({"code":err.code||400, "message":err.message||err.toString()||"Error!"});
          });
        } else {
          exists = await db.path(parentPath).path('pages').path(req.path).get().catch(err=>{return null;});
        }
      }
      if (exists && exists.data && isTextTypeFile(exists.key)) {
        let contentType = getContentType(isTextTypeFile(exists.key));
        if (contentType) {
          res.setHeader('content-type', contentType);
          return res.send(exists.data.content||"");
        }
      }
      let dynamicTemplate = (exists && exists.data.template) ? await getTemplate(exists.data.template) : defaultTemplate;
      if (exists && (exists.data.above ||
      exists.data.below || exists.data.title ||
      exists.data.content || exists.data.redirect)) {
        if (exists.data.redirect) {
          return res.redirect(exists.data.redirect);
        }
        exists.data.menu = await getMenu();
        return res.send(getHTML(dynamicTemplate, exists.data));
      }
      let notfound = await db.path(parentPath).path('pages').path('404').get().catch(err=>{return null;});
      if (notfound && notfound.data.content) {
        dynamicTemplate = (notfound && notfound.data.template) ? await getTemplate(notfound.data.template) : defaultTemplate;
        notfound.data.menu = await getMenu();
        return res.status(404).send(getHTML(dynamicTemplate, notfound.data));
      }
      next();
    };
  };

  return {"express":route}

}

module.exports = Pages;
