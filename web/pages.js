'use strict';

function Pages(db, parentPath="pages", container=null, callback) {
  const component = document.createElement('div');
  component.classList.add('component');
  component.classList.add('editor');
  component.innerHTML = `
<form method="POST">
<div>
<select name="list" placeholder="Documents:" aria-label="Documents"><option value="">Documents:</option></select>
<input name="path" value="" placeholder="Path:" aria-label="Path" />
<input name="title" value="" placeholder="Title:" aria-label="Title" />
<input name="description" value="" placeholder="Description:" aria-label="Description" />
<input name="pubdate" value="" placeholder="Publish Date:" aria-label="Publish Date" />
<input name="photo" value="" placeholder="Featured Photo:" aria-label="Featured Photo" />
<input name="redirect" value="" placeholder="Redirect:" aria-label="Redirect" />
<input name="template" value="" placeholder="Template:" aria-label="Template" />
</div>
<div>
<button name="loadButton">📂 Load</button>
<button name="deleteButton">🚫 Delete</button>
<button name="saveButton">💾 Save</button>
</div>
<p name="info" aria-label="Information"></p>
<textarea name="content" value="" placeholder="Content:" aria-label="Content" /></textarea>
<textarea name="above" value="" placeholder="Above Content:" aria-label="Above Content" /></textarea>
<textarea name="below" value="" placeholder="Below Content:" aria-label="Below Content" /></textarea>
</form>
`;

  const {list, path, title, description, pubdate, photo, content, redirect, template, above, below, loadButton, deleteButton, saveButton} = component.getElementsByTagName('form')[0].elements;
  const {info} = component.getElementsByTagName('form')[0].getElementsByTagName('p');
  let unsaved = false;

  above.onchange = above.onpaste = above.onkeyup = below.onchange = below.onpaste = below.onkeyup = content.onpaste = content.onchange = content.onkeyup = title.onpaste = title.onchange = title.onkeyup = description.onpaste = description.onchange = description.onkeyup = pubdate.onkeyup = pubdate.onchange = pubdate.onpaste = photo.onchange = photo.onpaste = photo.onkeyup = redirect.onchange = redirect.onkeyup = redirect.onpaste = template.onchange = template.onkeyup = template.onpaste = path.onchange = path.onkeyup = path.onpaste = (e) => {
    unsaved = true;
  };

  const refreshList = async () => {
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

  const hide = () => {
    component.classList.add('hidden');
  };

  const show = async () => {
    component.classList.remove('hidden');
    await refreshList();
  };

  hide();

  if (container) {
    container.appendChild(component);
  }

  return {component, hide, show};

}
