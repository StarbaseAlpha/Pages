'use strict';

function Pages(db, parentPath="pages", container=null, callback) {
  const component = document.createElement('div');
  component.classList.add('component');
  component.classList.add('editor');

  const list = document.createElement('select');
  list.placeholder = "Documents:";
  component.appendChild(list);

  const documentsOption = document.createElement('option');
  documentsOption.value = "Documents:";
  documentsOption.innerText = "Documents:";
  list.appendChild(documentsOption);

  const path = document.createElement('input');
  path.value = "";
  path.placeholder = "Path:";
  component.appendChild(path);

  const title = document.createElement('input');
  title.value = "";
  title.placeholder = "Title:";
  component.appendChild(title);

  const description = document.createElement('input');
  description.value = "";
  description.placeholder = "Description:";
  component.appendChild(description);

  const pubdate = document.createElement('input');
  pubdate.value = "";
  pubdate.placeholder = "Publish Date:";
  component.appendChild(pubdate);

  const author = document.createElement('input');
  author.value = "";
  author.placeHolder = "Author:";
  component.appendChild(author);

  const photo = document.createElement('input');
  photo.value = "";
  photo.placeholder = "Featured Photo:";
  component.appendChild(photo);

  const redirect = document.createElement('input');
  redirect.value = "";
  redirect.placeholder = "Redirect:";
  component.appendChild(redirect);

  const template = document.createElement('input');
  template.value = "";
  template.placeholder = "Template:";
  component.appendChild(template);

  const loadButton = document.createElement('button');
  loadButton.innerText = "📂 Load";
  component.appendChild(loadButton);

  const deleteButton = document.createElement('button');
  deleteButton.innerText = "🚫 Delete";
  component.appendChild(deleteButton);

  const saveButton = document.createElement('button');
  saveButton.innerText = "💾 Save";
  component.appendChild(saveButton);

  const info = document.createElement('p');
  info.classList.add('info');
  component.appendChild(info);

  const content = document.createElement('textarea');
  content.value = "";
  content.placeholder = "Content:";
  component.appendChild(content);

  const above = document.createElement('textarea');
  above.value = "";
  above.placeholder = "Above Content:";
  component.appendChild(above);

  const below = document.createElement('textarea');
  below.value = "";
  below.placeholder = "Below Content:";
  component.appendChild(below);

  let unsaved = false;

  above.onchange = above.onpaste = above.onkeyup = below.onchange = below.onpaste = below.onkeyup = content.onpaste = content.onchange = content.onkeyup = title.onpaste = title.onchange = title.onkeyup = description.onpaste = description.onchange = description.onkeyup = pubdate.onkeyup = pubdate.onchange = pubdate.onpaste = author.onkeyup = author.onchange = author.onpaste = photo.onchange = photo.onpaste = photo.onkeyup = redirect.onchange = redirect.onkeyup = redirect.onpaste = template.onchange = template.onkeyup = template.onpaste = path.onchange = path.onkeyup = path.onpaste = (e) => {
    unsaved = true;
  };

  let refreshing = false;

  const refreshList = async () => {
    if (refreshing) {
      return null;
    }
    refreshing = true;
    list.innerHTML = "";
    let firstOption = document.createElement('option');
    firstOption.innerText = "Documents:";
    firstOption.value = "";
    list.appendChild(firstOption);
    let docs = await db.path(parentPath).list({"deep":true});
    docs.data.forEach(doc=>{
      let option = document.createElement('option');
      option.value = db.parse(doc.path.replace(parentPath, '')).path;
      option.innerText = db.parse(doc.path.replace(parentPath, '')).path;
      list.appendChild(option);
    });
    list.onchange = async (e) => {
      let last = path.value.toString();
      path.value = list.value;
      let loaded = await Load(e);
      if (!loaded) {
        path.value = "";
      }
    };
    refreshing = false;
  };

  const handler = (e) => {
    if (callback && typeof callback === 'function') {
      callback(e);
    }
  };

  const Load = async (e) => {
    e.preventDefault();
    if (unsaved && !confirm('Unsaved changes. Are you sure you want to continue?')) {
      list.value = "";
      return null;
    }
    unsaved = false;
    content.value = "";
    above.value = "";
    below.value = "";
    title.value = "";
    redirect.value = "";
    template.value = "";
    description.value = "";
    pubdate.value = "";
    author.value = "";
    photo.value = "";
    if (['/', '/pages', '/templates'].includes(db.path(path.value).parse().path)) {
      info.innerText = "This resource cannot be loaded in the editor.";
      return null;
    }
    return db.path(parentPath).path(path.value).get().then(async result=>{
      info.innerText = "Loaded";
      if (result.data.content) {
        content.value = result.data.content;
      }
      title.value = result.data.title || "";
      description.value = result.data.description || "";
      pubdate.value = result.data.pubdate || "";
      author.value = result.data.author || "";
      photo.value = result.data.photo || "";
      redirect.value = result.data.redirect || "";
      template.value = result.data.template || "";
      above.value = result.data.above || "";
      below.value = result.data.below || "";
      list.value = "";
      return true;
    }).catch(err=>{
      info.innerText = err.message || "Error";
      description.value = "";
      pubdate.value = "";
      author.value = "";
      photo.value = "";
      title.value = "";
      content.value = "";
      path.value = "";
    });
  };

  const Save = async (e) => {
    e.preventDefault();
    if (['/', 'pages', '/templates'].includes(db.path(path.value).parse().path)) {
      info.innerText = "This resource cannot be changed in the editor.";
      return null;
    }
    let data = {};
    data.title = title.value || "";
    data.description = description.value || "";
    data.pubdate = pubdate.value || "";
    data.author = author.value || "";
    data.photo = photo.value || "";
    data.content = content.value || "";
    data.redirect = redirect.value || "";
    data.template = template.value || "";
    data.above = above.value || "";
    data.below = below.value || "";
    await db.path(parentPath).path(path.value).put(data).then(result=>{
      info.innerText = "Saved";
      handler({"type":"save", "path":path.value});
      unsaved = false;
      refreshList();
    }).catch(err=>{
      info.innerText = err.message || "Error";
    });
  };

  const Delete = async (e) => {
    e.preventDefault();
    if (['/', '/pages', '/menu', '/templates'].includes(db.path(path.value).parse().path)) {
      info.innerText = "This resource cannot be changed in the editor.";
      return null;
    }
    if (!confirm('Do you really want to delete this?')) {
      return null;
    }

    db.path(parentPath).path(path.value).del().then(result=>{
      title.value = "";
      description.value = "";
      pubdate.value = "";
      author.value = "";
      photo.value = "";
      content.value = "";
      above.value = "";
      below.value = "";
      redirect.value = "";
      template.value = "";
      info.innerText = "Deleted";
      path.value = "";
      handler({"type":"delete", "path":path.value});
      unsaved = false;
      refreshList();
    }).catch(err=>{
      info.innerText = err.message || "Error";
    });
  };

  loadButton.onclick = Load;
  saveButton.onclick = Save;
  deleteButton.onclick = Delete;

  const hide = (doNotDisplay=false) => {
    component.classList.add('hidden');
    if (doNotDisplay) {
      component.style.display = "none";
    }
  };

  const show = async (displayType=null) => {
    component.classList.remove('hidden');
    if (displayType) {
      component.style.display = displayType.toString();
    }
    await refreshList();
  };

  hide();

  if (container) {
    container.appendChild(component);
  }

  return {component, hide, show};

}
