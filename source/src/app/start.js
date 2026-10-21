$('courseDialog').addEventListener('click',e=>{if(e.target===$('courseDialog')){const r=$('courseDialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('courseDialog').close();}});
render();
