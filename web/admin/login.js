'use strict';
const form=document.querySelector('#login'),notice=document.querySelector('#notice'),button=document.querySelector('#submit');
form.addEventListener('submit',async event=>{
 event.preventDefault();if(location.protocol!=='https:'){notice.textContent='Güvenli HTTPS adresinden giriş yapın.';return;}button.disabled=true;notice.textContent='Giriş kontrol ediliyor…';
 try {
  const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:form.username.value,key:form.key.value}),credentials:'same-origin'});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'Giriş yapılamadı.');
  form.key.value='';location.replace('/admin');
 }catch(error){notice.textContent=error.message;notice.className='error';button.disabled=false}
});
