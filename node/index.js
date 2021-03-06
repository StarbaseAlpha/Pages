'use strict';

function Pages(db, template, parentPath="homepage", dynamicTemplating=false) {

  const getMenu = async () => {
    return await db.path(parentPath).path('menu').get().then(result=>{
      return result.data || {};
    }).catch(err=>{return {};});
  };

  const getTemplate = async (templateName) => {
    if (!dynamicTemplating || !templateName) {
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

  const route = () => {
    return async (req, res, next) => {
      let exists = null;
      if (db.path(req.path).parse().path === '/') {
        exists = await db.path(parentPath).path('pages').path('home').get().catch(err=>{return null;});
      } else {
        exists = await db.path(parentPath).path('pages').path(req.path).get().catch(err=>{return null;});
      }
      let dynamicTemplate = (exists && exists.data.template) ? await getTemplate(exists.data.template) : template;
      if (!dynamicTemplate) {
        dynamicTemplate = template;
      }
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
        notfound.data.menu = await getMenu();
        return res.status(404).send(getHTML(dynamicTemplate, notfound.data));
      }

      next();

    };
  };

  return {"express":route}

}

module.exports = Pages;
