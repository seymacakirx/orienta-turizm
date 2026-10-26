import {DatabaseSync} from 'node:sqlite';
import {randomBytes,createHash} from 'node:crypto';
import fs from 'node:fs';
export const origin='https://example.test';
export const hash=value=>createHash('sha256').update(value).digest('hex');
export function databaseFixture(){
 const db=new DatabaseSync(':memory:');
 for(const file of ['0000_cms.sql','0001_admin_auth.sql'])db.exec(fs.readFileSync('drizzle/'+file,'utf8'));
 const key='ot1_'+randomBytes(32).toString('base64url');
 const env={ADMIN_USERNAME:'yonetici',ADMIN_KEY_SHA256:hash(key),DB:{
  prepare(sql){
   let args=[];
   return {
    bind(...values){args=values;return this},
    async first(){return db.prepare(sql).get(...args)||null},
    async run(){const result=db.prepare(sql).run(...args);return {meta:{changes:Number(result.changes)}}}
   };
  }
 }};
 async function login(worker,extra={}){return worker.fetch(new Request(origin+'/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...extra},body:JSON.stringify({username:'yonetici',key})}),env)}
 return{db,env,key,login};
}
export const cookie=response=>response.headers.get('Set-Cookie')?.split(';')[0];
