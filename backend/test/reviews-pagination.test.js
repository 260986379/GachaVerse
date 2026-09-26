process.env.TASK_SECRET='x'; process.env.RATE_LIMIT_MAX='100000';
const path=require('path'), http=require('http');
const BE = require('path').join(__dirname, '..', 'src');

let lastSql=null,lastParams=null,rowsToReturn=[],mineRows=[],totalsRow={total:0,total_upvotes:0};
const dbPath=require.resolve(path.join(BE,'config/db.js'));
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{query:async(sql,params)=>{
  const n=sql.replace(/\s+/g,' ').trim();
  if(/COUNT\(r\.id\)::int AS total/i.test(n)) return {rows:[totalsRow]};
  if(/AND r\.user_id = \$2/i.test(n)) return {rows:mineRows};
  lastSql=n; lastParams=params; return {rows:rowsToReturn};
}}};
const authPath=require.resolve(path.join(BE,'middleware/auth.js'));
let currentUser=null;
require.cache[authPath]={id:authPath,filename:authPath,loaded:true,exports:{
  authenticateToken:(q,s,n)=>{q.user=currentUser;n();},
  optionalAuth:(q,s,n)=>{q.user=currentUser;n();},
  authenticateFirebase:(q,s,n)=>{q.user=currentUser;n();}}};

const app=require(path.join(BE,'app.js'));
let pass=0,fail=0;
const check=(n,c,e)=>{ if(c){pass++;console.log('  PASS  '+n);} else {fail++;console.log('  FAIL  '+n+(e!==undefined?'  got: '+e:''));} };
const mk=(n,uid)=>Array.from({length:n},(_,i)=>({id:'r'+i,rating:8,body:'b',user_id:uid||('u'+i),username:'n',avatar_url:null,upvote_count:0}));

const server=app.listen(0,async()=>{
  const port=server.address().port;
  const get=(p)=>new Promise(r=>http.get({port,path:p},res=>{let b='';res.on('data',c=>b+=c);res.on('end',()=>r({status:res.statusCode,body:(()=>{try{return JSON.parse(b)}catch{return b}})()}))}));

  console.log('\n--- getReviews: LIMIT is applied ---');
  currentUser=null; rowsToReturn=mk(21);
  let r=await get('/api/reviews/zzz');
  check('LIMIT/OFFSET in SQL', /LIMIT \$2 OFFSET \$3/.test(lastSql), lastSql?.slice(-40));
  check('default page size 20 (fetches 21)', lastParams[1]===21, JSON.stringify(lastParams));
  check('offset 0', lastParams[2]===0);
  check('returns {items,hasMore}', Array.isArray(r.body.items) && typeof r.body.hasMore==='boolean', JSON.stringify(r.body).slice(0,60));
  check('items trimmed to 20', r.body.items.length===20, r.body.items.length);
  check('hasMore true', r.body.hasMore===true);

  rowsToReturn=mk(5); r=await get('/api/reviews/zzz');
  check('short page -> hasMore false', r.body.hasMore===false);
  check('all 5 returned', r.body.items.length===5);

  console.log('\n--- limit/page clamping ---');
  rowsToReturn=mk(1);
  await get('/api/reviews/zzz?limit=999'); check('limit clamped to 50', lastParams[1]===51, lastParams[1]);
  await get('/api/reviews/zzz?limit=-5');  check('negative limit clamped to >=1', lastParams[1]===2, lastParams[1]);
  await get('/api/reviews/zzz?limit=abc'); check('bad limit -> default 20', lastParams[1]===21, lastParams[1]);
  await get('/api/reviews/zzz?page=3&limit=10'); check('page=3 limit=10 -> offset 20', lastParams[2]===20, lastParams[2]);
  await get('/api/reviews/zzz?page=-2'); check('negative page -> offset 0', lastParams[2]===0);

  console.log('\n--- sort still server-side and safe ---');
  await get('/api/reviews/zzz?sort=top');    check('sort=top uses upvote ordering', /COUNT\(uv\.user_id\) DESC/.test(lastSql));
  await get('/api/reviews/zzz?sort=latest'); check('sort=latest uses created_at', /ORDER BY r\.created_at DESC/.test(lastSql));
  await get('/api/reviews/zzz?sort='+encodeURIComponent(';DROP TABLE game_reviews')); check('unknown sort falls back, not injected', /ORDER BY r\.created_at DESC/.test(lastSql) && !/DROP/.test(lastSql));

  console.log('\n--- authenticated: placeholder numbering shifts correctly ---');
  currentUser={id:'me'}; rowsToReturn=mk(3,'me'); mineRows=[];
  r=await get('/api/reviews/zzz');
  check('auth: LIMIT $3 OFFSET $4', /LIMIT \$3 OFFSET \$4/.test(lastSql), lastSql?.slice(-40));
  check('auth: params [game, me, 21, 0]', JSON.stringify(lastParams)==='["zzz","me",21,0]', JSON.stringify(lastParams));
  check('user_upvoted uses $2', /uv\.user_id = \$2/.test(lastSql));
  check('myReview found on page', r.body.myReview?.user_id==='me', JSON.stringify(r.body.myReview)?.slice(0,40));

  console.log('\n--- myReview when it is NOT on the current page ---');
  rowsToReturn=mk(3,'someone-else'); mineRows=[{id:'mine',rating:9,body:'x',user_id:'me',username:'me',avatar_url:null,upvote_count:0}];
  r=await get('/api/reviews/zzz');
  check('myReview fetched separately', r.body.myReview?.id==='mine', JSON.stringify(r.body.myReview)?.slice(0,50));
  check('  -> still absent from items', !r.body.items.some(x=>x.user_id==='me'));

  currentUser=null; rowsToReturn=mk(2); r=await get('/api/reviews/zzz');
  check('anonymous -> myReview null', r.body.myReview===null, JSON.stringify(r.body.myReview));

  console.log('\n--- getUserReviews ---');
  rowsToReturn=mk(21); totalsRow={total:57,total_upvotes:123};
  r=await get('/api/reviews/user/u1');
  check('LIMIT $2 OFFSET $3', /LIMIT \$2 OFFSET \$3/.test(lastSql), lastSql?.slice(-40));
  check('fetches limit+1', lastParams[1]===21, JSON.stringify(lastParams));
  check('items trimmed to 20', r.body.items.length===20);
  check('hasMore true', r.body.hasMore===true);
  check('server total (not page length)', r.body.total===57, r.body.total);
  check('server totalUpvotes', r.body.totalUpvotes===123, r.body.totalUpvotes);

  console.log('\n'+pass+' passed, '+fail+' failed');
  server.close(()=>process.exit(fail?1:0));
});
