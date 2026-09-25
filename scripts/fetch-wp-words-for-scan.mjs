import {writeFileSync} from 'fs';
const {WP_API,WP_AUTH_USER,WP_AUTH_PASS}=process.env;
const auth=Buffer.from(`${WP_AUTH_USER}:${WP_AUTH_PASS}`).toString('base64');
const Q=`query($after:String,$stati:[PostStatusEnum]){berlinerWords(first:100,after:$after,where:{stati:$stati,orderby:{field:TITLE,order:ASC}}){edges{node{databaseId slug title status wordProperties{berlinerisch article translations{translation} infoText examples{example exampleExplanation} alternativeWords{alternativeWord}}}} pageInfo{endCursor hasNextPage}}}`;
const all=[];let after=null;
while(true){
 const r=await fetch(WP_API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Basic ${auth}`},body:JSON.stringify({query:Q,variables:{after,stati:['PUBLISH','DRAFT','PENDING','PRIVATE','FUTURE']}})});
 const j=await r.json(); if(j.errors){console.error('GQL error',j.errors.map(e=>e.message.slice(0,80)));process.exit(1)}
 const d=j.data.berlinerWords; all.push(...d.edges.map(e=>e.node));
 if(!d.pageInfo.hasNextPage)break; after=d.pageInfo.endCursor;
}
writeFileSync('/tmp/ref/wp-export.json',JSON.stringify(all));
const c={};for(const n of all)c[n.status]=(c[n.status]||0)+1;
console.log('total',all.length,c);
