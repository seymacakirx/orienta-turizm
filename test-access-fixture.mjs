// Real RSA signatures for tests only. Never imported into the built Worker.
export async function accessFixture() {
 const keys = await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk = {...await crypto.subtle.exportKey('jwk',keys.publicKey),kid:'test-key',alg:'RS256',use:'sig'};
 const env = {ACCESS_ISSUER:'https://test-team.cloudflareaccess.com',ACCESS_AUD:'test-audience',ADMIN_EMAILS:'admin@example.test'};
 const originalFetch = globalThis.fetch;
 globalThis.fetch = async url => {
  if (url !== env.ACCESS_ISSUER+'/cdn-cgi/access/certs') throw new Error('Unexpected fetch');
  return Response.json({keys:[jwk]});
 };
 async function token(overrides={},header={}) {
  const now=Math.floor(Date.now()/1000);
  const claims={iss:env.ACCESS_ISSUER,aud:[env.ACCESS_AUD],email:env.ADMIN_EMAILS,sub:'test-admin',type:'app',iat:now,exp:now+3600,...overrides};
  const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
  const input=encode({alg:'RS256',kid:'test-key',...header})+'.'+encode(claims);
  const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(input));
  return input+'.'+Buffer.from(signature).toString('base64url');
 }
 return {env, token, jwk, restore(){globalThis.fetch=originalFetch}};
}
