'use strict';
function Pages(db, parentPath="pages", runFunctionsKit=null, cacheDB=null, cacheTTL=30000) {

  const defaultTemplate = (data)=>{
    return `<!DOCTYPE html>
<title>${data.title}</title>
<meta name="viewport" content="width=device-width">
<meta name="description" content="${data.description}">
${data.above}
${data.content}
${data.below}`;
  }

  const getCache = async (path) => {
    if (!cacheDB) {
      return null;
    }
    let cached = await cacheDB.path(path).get().catch(err=>{return null;});
    if (cached && cached.data && cached.data.doc) {
      if (cached.data.expires > Date.now()) {
        return cached.data.doc;
      } else {
        await cacheDB.path(path).del();
        return null;
      }
    }
  };

  const writeCache = async (path, doc) => {
    if (!cacheDB) {
      return null;
    }
    await cacheDB.path(path).put({
      "doc":doc,
      "expires": parseInt(parseInt(Date.now()) + parseInt(cacheTTL))
    });
    return true;
  };

  const getMenu = async () => {
    let cached = await getCache(db.path(parentPath).path('menu').parse().path);
    if (cached && cached.data) {
      return cached.data;
    }
    let menu = await db.path(parentPath).path('menu').get().catch(err=>{return null;});
    await writeCache(db.path(parentPath).path('menu').parse().path, menu);
    if (menu.data) {
      return menu.data;
    } else {
      return {};
    }
  };

  const getTemplate = async (templateName) => {
    if (!templateName) {
      return null;
    }
    let result = await getCache(db.path(parentPath).path('templates').path(templateName).parse().path); 
    if (!result) {
      result = await db.path(parentPath).path('templates').path(templateName).get().catch(err=>{});
      if (result && result.data) {
        await writeCache(db.path(parentPath).path('templates').path(templateName).parse().path, result);
      }
    }
    if (!result || !result.data || !result.data.content) {
      return null;
    }
    let dynamicTemplate = new Function('return ' + result.data.content||'' + ';')();
    if (typeof dynamicTemplate === 'function') {
      return dynamicTemplate;
    } else {
      return null;
    }
  };

  const getHTML = (template, data) => {
    let result = template({
      "title":data.title||'',
      "description":data.description||'',
      "pubdate":data.pubdate||'',
      "author":data.author||'',
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
        exists = await getCache(db.path(parentPath).path('pages').path('home').parse().path);
        if (!exists) {
          exists = await db.path(parentPath).path('pages').path('home').get().catch(err=>{return null;});
          if (exists) {
            await writeCache(db.path(parentPath).path('pages').path('home').parse().path, exists);
          }
        }
      } else {
        if (runFunctionsKit) {
          exists = await getCache(db.path(parentPath).path('functions').path(req.path).parse().path);
          if (!exists) {
            exists = await db.path(parentPath).path('functions').path(req.path).get().catch(err=>{return null;});
            if (exists) {
              await writeCache(db.path(parentPath).path('functions').path(req.path).parse().path, exists);
            }
          }
        }
        if (exists && exists.data && exists.data.content) {
          return runCode(req, res, exists.data.content, runFunctionsKit).then(result=>{
            res.json(result);
          }).catch(err=>{
            res.status(err.code||400).json({"code":err.code||400, "message":err.message||err.toString()||"Error!"});
          });
        } else {
          exists = await getCache(db.path(parentPath).path('pages').path(req.path).parse().path);
          if (!exists) {
            exists = await db.path(parentPath).path('pages').path(req.path).get().catch(err=>{return null;});
            await writeCache(db.path(parentPath).path('pages').path(req.path).parse().path, exists);
          }
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
      let notfound = await getCache(db.path(parentPath).path('pages').path('404').parse().path);
      if (!notfound) {
        notfound = await db.path(parentPath).path('pages').path('404').get().catch(err=>{return null;});
        await writeCache(db.path(parentPath).path('pages').path('404').parse().path, notfound);
      }
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
