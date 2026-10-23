const xmlEscape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plain=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
async function seoResponse(request,env){
 const u=new URL(request.url),path=u.pathname;
 if(path==='/robots.txt')return new Response('User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: '+u.origin+'/sitemap.xml\n',{headers:{'Content-Type':'text/plain; charset=utf-8'}});
 const res=await api(new Request(u.origin+'/api/content'),env,DEFAULTS),doc=await res.json();
 const languages=['tr','en','ru'];const pageURL=(p,l)=>u.origin+p+'?lang='+l;
 if(path==='/sitemap.xml'){
  const pages=['/',...doc.services.map(s=>'/services/'+s.id),'/blog'].flatMap(p=>languages.map(l=>({p,l})));
  for(const post of doc.posts||[])for(const l of languages)if(publishedPost(post,l))pages.push({p:'/blog/'+post.slug,l});
  return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+pages.map(({p,l})=>'<url><loc>'+xmlEscape(pageURL(p,l))+'</loc></url>').join('')+'</urlset>',{headers:{'Content-Type':'application/xml; charset=utf-8'}});
 }
 const lang=languages.includes(u.searchParams.get('lang'))?u.searchParams.get('lang'):'en';
 const service=doc.services.find(s=>path==='/services/'+s.id),blog=path==='/blog',post=(doc.posts||[]).find(p=>path==='/blog/'+p.slug&&publishedPost(p,lang));
 const found=path==='/'||service||blog||post;
 const config=doc.config,t=doc.texts[lang],seo=config.seo?.[lang]||{};
 const s=service?{title:service[lang][0],summary:service[lang][2],image:service.image,...config.services?.[service.id],...config.services?.[service.id]?.[lang]}:null;
 const p=post?.[lang];const title=!found?'404 | '+config.brand:s?(s.seoTitle||s.title+' | '+config.brand):post?(p.seoTitle||p.title+' | '+config.brand):blog?(seo.blogTitle||'Blog | '+config.brand):(seo.title||config.pageTitle+' | '+plain(t.intro));
 const description=plain(s?(s.description||s.summary):post?(p.description||p.summary):blog?(seo.blogDescription||{tr:'İstanbul deneyimleri, gezi notları ve seyahat önerileri.',en:'Istanbul experiences, travel notes and trip inspiration.',ru:'Впечатления о Стамбуле, заметки о путешествиях и идеи для поездки.'}[lang]):(seo.description||t.sub));
 const canonical=pageURL(path,lang),image=s?.detailImage||s?.image||post?.image||config.poster;
 const absolute=v=>{try{const a=new URL(v,u.origin);return /^https?:$/.test(a.protocol)?a.href:undefined}catch{return undefined}};
 const available=post?languages.filter(l=>publishedPost(post,l)):found?languages:[];
 const organization={'@type':'Organization','@id':u.origin+'/#organization',name:config.companyName||config.brand,url:u.origin,logo:absolute(config.logo),...(config.phone?{telephone:config.phone}:{}),...(config.email?{email:config.email}:{}),...(config.address?{address:config.address}:{}),sameAs:[config.instagram,config.facebook].filter(Boolean).map(absolute).filter(Boolean)};
 const schema={'@context':'https://schema.org','@graph':[organization,{'@type':'WebSite','@id':u.origin+'/#website',name:config.pageTitle||config.brand,url:u.origin,publisher:{'@id':organization['@id']},inLanguage:languages},{'@type':post?'BlogPosting':s?'Service':blog?'CollectionPage':'WebPage','@id':canonical+'#content',url:canonical,name:title,headline:post?p.title:undefined,description,inLanguage:lang,image:absolute(image),...(s?{serviceType:s.title,areaServed:'Istanbul',provider:{'@id':organization['@id']}}:{}),...(post?{mainEntityOfPage:canonical,author:post.author?{'@type':'Person',name:post.author}:undefined,publisher:{'@id':organization['@id']},datePublished:post.publishedAt||undefined,dateModified:post.modifiedAt||undefined}: {})}]};
 if(path!=='/'&&found)schema['@graph'].push({'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:t.home,item:pageURL('/',lang)},...(post?[{'@type':'ListItem',position:2,name:'Blog',item:pageURL('/blog',lang)}]:[]),{'@type':'ListItem',position:post?3:2,name:s?.title||p?.title||'Blog',item:canonical}]});
 const head=`<title>${xmlEscape(title)}</title><meta name="description" content="${xmlEscape(description)}"><meta name="robots" content="${found?'index,follow,max-image-preview:large':'noindex,follow'}"><link rel="canonical" href="${xmlEscape(canonical)}">${available.map(l=>`<link rel="alternate" hreflang="${l}" href="${xmlEscape(pageURL(path,l))}">`).join('')}${available.length?`<link rel="alternate" hreflang="x-default" href="${xmlEscape(pageURL(path,available.includes('en')?'en':available[0]))}">`:''}<meta property="og:type" content="${post?'article':'website'}"><meta property="og:title" content="${xmlEscape(title)}"><meta property="og:description" content="${xmlEscape(description)}"><meta property="og:url" content="${xmlEscape(canonical)}"><meta property="og:image" content="${xmlEscape(absolute(image)||'')}"><meta property="og:locale" content="${{tr:'tr_TR',en:'en_GB',ru:'ru_RU'}[lang]}"><meta name="twitter:card" content="summary_large_image">${config.googleVerification?`<meta name="google-site-verification" content="${xmlEscape(config.googleVerification)}">`:''}<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<','\\u003c')}</script>`;
 const rendered=renderDocument(doc,lang,u);
 let html=new TextDecoder().decode(Uint8Array.from(atob(ASSETS['/index.html'].body),c=>c.charCodeAt(0)));
 html=html.replace(/<title>[\s\S]*?<\/title>/,'').replace(/<meta name="description"[^>]*>/,'').replace('<html lang="tr">',`<html lang="${lang}">`).replace('</head>',head+'</head>');
 for(const id of ['header','main','footer','contactbar'])html=html.replace(new RegExp('(<(?:header|main|footer|aside) id="'+id+'">)(</(?:header|main|footer|aside)>)'),'$1'+(id==='main'&&!found?'<section class="blog-list"><h1>404</h1><a href="/?lang='+lang+'">'+xmlEscape(t.home)+'</a></section>':rendered[id])+'$2');
 const boot=JSON.stringify(doc).replaceAll('<','\\u003c');
 html=html.replace('<script defer src="/config.js"></script><script defer src="/content.js"></script>',`<script>const boot=${boot};window.SITE_CONFIG=boot.config;window.SITE_TEXT=boot.texts;window.SERVICES=boot.services;window.SITE_POSTS=boot.posts||[];window.SITE_BOOTSTRAP=true;</script>`);
 if(!found)html=html.replace('<script defer src="/app.js"></script>','');
 return new Response(html,{status:found?200:404,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','Content-Language':lang,'X-Content-Type-Options':'nosniff'}});
}
