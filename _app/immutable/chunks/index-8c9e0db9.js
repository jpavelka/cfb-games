function E(){}const lt=t=>t;function st(t,e){for(const n in e)t[n]=e[n];return t}function ut(t){return t&&typeof t=="object"&&typeof t.then=="function"}function K(t){return t()}function I(){return Object.create(null)}function $(t){t.forEach(K)}function Q(t){return typeof t=="function"}function zt(t,e){return t!=t?e==e:t!==e||t&&typeof t=="object"||typeof t=="function"}let C;function Bt(t,e){return C||(C=document.createElement("a")),C.href=e,t===C.href}function ot(t){return Object.keys(t).length===0}function U(t,...e){if(t==null)return E;const n=t.subscribe(...e);return n.unsubscribe?()=>n.unsubscribe():n}function Ft(t){let e;return U(t,n=>e=n)(),e}function Ht(t,e,n){t.$$.on_destroy.push(U(e,n))}function It(t,e,n,c){if(t){const i=V(t,e,n,c);return t[0](i)}}function V(t,e,n,c){return t[1]&&c?st(n.ctx.slice(),t[1](c(e))):n.ctx}function Wt(t,e,n,c){if(t[2]&&c){const i=t[2](c(n));if(e.dirty===void 0)return i;if(typeof i=="object"){const s=[],r=Math.max(e.dirty.length,i.length);for(let u=0;u<r;u+=1)s[u]=e.dirty[u]|i[u];return s}return e.dirty|i}return e.dirty}function Gt(t,e,n,c,i,s){if(i){const r=V(e,n,c,s);t.p(r,i)}}function Jt(t){if(t.ctx.length>32){const e=[],n=t.ctx.length/32;for(let c=0;c<n;c++)e[c]=-1;return e}return-1}function Kt(t){return t==null?"":t}function Qt(t,e,n){return t.set(n),e}const X=typeof window!="undefined";let at=X?()=>window.performance.now():()=>Date.now(),B=X?t=>requestAnimationFrame(t):E;const x=new Set;function Y(t){x.forEach(e=>{e.c(t)||(x.delete(e),e.f())}),x.size!==0&&B(Y)}function ft(t){let e;return x.size===0&&B(Y),{promise:new Promise(n=>{x.add(e={c:t,f:n})}),abort(){x.delete(e)}}}let P=!1;function _t(){P=!0}function dt(){P=!1}function ht(t,e,n,c){for(;t<e;){const i=t+(e-t>>1);n(i)<=c?t=i+1:e=i}return t}function mt(t){if(t.hydrate_init)return;t.hydrate_init=!0;let e=t.childNodes;if(t.nodeName==="HEAD"){const l=[];for(let o=0;o<e.length;o++){const _=e[o];_.claim_order!==void 0&&l.push(_)}e=l}const n=new Int32Array(e.length+1),c=new Int32Array(e.length);n[0]=-1;let i=0;for(let l=0;l<e.length;l++){const o=e[l].claim_order,_=(i>0&&e[n[i]].claim_order<=o?i+1:ht(1,i,a=>e[n[a]].claim_order,o))-1;c[l]=n[_]+1;const f=_+1;n[f]=l,i=Math.max(f,i)}const s=[],r=[];let u=e.length-1;for(let l=n[i]+1;l!=0;l=c[l-1]){for(s.push(e[l-1]);u>=l;u--)r.push(e[u]);u--}for(;u>=0;u--)r.push(e[u]);s.reverse(),r.sort((l,o)=>l.claim_order-o.claim_order);for(let l=0,o=0;l<r.length;l++){for(;o<s.length&&r[l].claim_order>=s[o].claim_order;)o++;const _=o<s.length?s[o]:null;t.insertBefore(r[l],_)}}function pt(t,e){t.appendChild(e)}function Z(t){if(!t)return document;const e=t.getRootNode?t.getRootNode():t.ownerDocument;return e&&e.host?e:t.ownerDocument}function yt(t){const e=tt("style");return gt(Z(t),e),e.sheet}function gt(t,e){pt(t.head||t,e)}function bt(t,e){if(P){for(mt(t),(t.actual_end_child===void 0||t.actual_end_child!==null&&t.actual_end_child.parentElement!==t)&&(t.actual_end_child=t.firstChild);t.actual_end_child!==null&&t.actual_end_child.claim_order===void 0;)t.actual_end_child=t.actual_end_child.nextSibling;e!==t.actual_end_child?(e.claim_order!==void 0||e.parentNode!==t)&&t.insertBefore(e,t.actual_end_child):t.actual_end_child=e.nextSibling}else(e.parentNode!==t||e.nextSibling!==null)&&t.appendChild(e)}function Ut(t,e,n){P&&!n?bt(t,e):(e.parentNode!==t||e.nextSibling!=n)&&t.insertBefore(e,n||null)}function xt(t){t.parentNode.removeChild(t)}function Vt(t,e){for(let n=0;n<t.length;n+=1)t[n]&&t[n].d(e)}function tt(t){return document.createElement(t)}function F(t){return document.createTextNode(t)}function Xt(){return F(" ")}function Yt(){return F("")}function Zt(t,e,n,c){return t.addEventListener(e,n,c),()=>t.removeEventListener(e,n,c)}function te(t,e,n){n==null?t.removeAttribute(e):t.getAttribute(e)!==n&&t.setAttribute(e,n)}function $t(t){return Array.from(t.childNodes)}function wt(t){t.claim_info===void 0&&(t.claim_info={last_index:0,total_claimed:0})}function et(t,e,n,c,i=!1){wt(t);const s=(()=>{for(let r=t.claim_info.last_index;r<t.length;r++){const u=t[r];if(e(u)){const l=n(u);return l===void 0?t.splice(r,1):t[r]=l,i||(t.claim_info.last_index=r),u}}for(let r=t.claim_info.last_index-1;r>=0;r--){const u=t[r];if(e(u)){const l=n(u);return l===void 0?t.splice(r,1):t[r]=l,i?l===void 0&&t.claim_info.last_index--:t.claim_info.last_index=r,u}}return c()})();return s.claim_order=t.claim_info.total_claimed,t.claim_info.total_claimed+=1,s}function kt(t,e,n,c){return et(t,i=>i.nodeName===e,i=>{const s=[];for(let r=0;r<i.attributes.length;r++){const u=i.attributes[r];n[u.name]||s.push(u.name)}s.forEach(r=>i.removeAttribute(r))},()=>c(e))}function ee(t,e,n){return kt(t,e,n,tt)}function vt(t,e){return et(t,n=>n.nodeType===3,n=>{const c=""+e;if(n.data.startsWith(c)){if(n.data.length!==c.length)return n.splitText(c.length)}else n.data=c},()=>F(e),!0)}function ne(t){return vt(t," ")}function re(t,e){e=""+e,t.wholeText!==e&&(t.data=e)}function ie(t,e,n,c){n===null?t.style.removeProperty(e):t.style.setProperty(e,n,c?"important":"")}function ce(t,e,n){t.classList[n?"add":"remove"](e)}function Et(t,e,{bubbles:n=!1,cancelable:c=!1}={}){const i=document.createEvent("CustomEvent");return i.initCustomEvent(t,n,c,e),i}const M=new Map;let R=0;function jt(t){let e=5381,n=t.length;for(;n--;)e=(e<<5)-e^t.charCodeAt(n);return e>>>0}function Ct(t,e){const n={stylesheet:yt(e),rules:{}};return M.set(t,n),n}function W(t,e,n,c,i,s,r,u=0){const l=16.666/c;let o=`{
`;for(let y=0;y<=1;y+=l){const b=e+(n-e)*s(y);o+=y*100+`%{${r(b,1-b)}}
`}const _=o+`100% {${r(n,1-n)}}
}`,f=`__svelte_${jt(_)}_${u}`,a=Z(t),{stylesheet:d,rules:h}=M.get(a)||Ct(a,t);h[f]||(h[f]=!0,d.insertRule(`@keyframes ${f} ${_}`,d.cssRules.length));const g=t.style.animation||"";return t.style.animation=`${g?`${g}, `:""}${f} ${c}ms linear ${i}ms 1 both`,R+=1,f}function Nt(t,e){const n=(t.style.animation||"").split(", "),c=n.filter(e?s=>s.indexOf(e)<0:s=>s.indexOf("__svelte")===-1),i=n.length-c.length;i&&(t.style.animation=c.join(", "),R-=i,R||At())}function At(){B(()=>{R||(M.forEach(t=>{const{stylesheet:e}=t;let n=e.cssRules.length;for(;n--;)e.deleteRule(n);t.rules={}}),M.clear())})}let v;function m(t){v=t}function q(){if(!v)throw new Error("Function called outside component initialization");return v}function le(t){q().$$.on_mount.push(t)}function se(t){q().$$.after_update.push(t)}function ue(t,e){return q().$$.context.set(t,e),e}const k=[],G=[],A=[],J=[],nt=Promise.resolve();let z=!1;function rt(){z||(z=!0,nt.then(H))}function oe(){return rt(),nt}function O(t){A.push(t)}const L=new Set;let N=0;function H(){const t=v;do{for(;N<k.length;){const e=k[N];N++,m(e),St(e.$$)}for(m(null),k.length=0,N=0;G.length;)G.pop()();for(let e=0;e<A.length;e+=1){const n=A[e];L.has(n)||(L.add(n),n())}A.length=0}while(k.length);for(;J.length;)J.pop()();z=!1,L.clear(),m(t)}function St(t){if(t.fragment!==null){t.update(),$(t.before_update);const e=t.dirty;t.dirty=[-1],t.fragment&&t.fragment.p(t.ctx,e),t.after_update.forEach(O)}}let w;function Mt(){return w||(w=Promise.resolve(),w.then(()=>{w=null})),w}function T(t,e,n){t.dispatchEvent(Et(`${e?"intro":"outro"}${n}`))}const S=new Set;let p;function Rt(){p={r:0,c:[],p}}function Ot(){p.r||$(p.c),p=p.p}function it(t,e){t&&t.i&&(S.delete(t),t.i(e))}function Pt(t,e,n,c){if(t&&t.o){if(S.has(t))return;S.add(t),p.c.push(()=>{S.delete(t),c&&(n&&t.d(1),c())}),t.o(e)}}const qt={duration:0};function ae(t,e,n,c){let i=e(t,n),s=c?0:1,r=null,u=null,l=null;function o(){l&&Nt(t,l)}function _(a,d){const h=a.b-s;return d*=Math.abs(h),{a:s,b:a.b,d:h,duration:d,start:a.start,end:a.start+d,group:a.group}}function f(a){const{delay:d=0,duration:h=300,easing:g=lt,tick:y=E,css:b}=i||qt,D={start:at()+d,b:a};a||(D.group=p,p.r+=1),r||u?u=D:(b&&(o(),l=W(t,s,a,h,d,g,b)),a&&y(0,1),r=_(D,h),O(()=>T(t,a,"start")),ft(j=>{if(u&&j>u.start&&(r=_(u,h),u=null,T(t,r.b,"start"),b&&(o(),l=W(t,s,r.b,r.duration,0,g,i.css))),r){if(j>=r.end)y(s=r.b,1-s),T(t,r.b,"end"),u||(r.b?o():--r.group.r||$(r.group.c)),r=null;else if(j>=r.start){const ct=j-r.start;s=r.a+r.d*g(ct/r.duration),y(s,1-s)}}return!!(r||u)}))}return{run(a){Q(i)?Mt().then(()=>{i=i(),f(a)}):f(a)},end(){o(),r=u=null}}}function fe(t,e){const n=e.token={};function c(i,s,r,u){if(e.token!==n)return;e.resolved=u;let l=e.ctx;r!==void 0&&(l=l.slice(),l[r]=u);const o=i&&(e.current=i)(l);let _=!1;e.block&&(e.blocks?e.blocks.forEach((f,a)=>{a!==s&&f&&(Rt(),Pt(f,1,1,()=>{e.blocks[a]===f&&(e.blocks[a]=null)}),Ot())}):e.block.d(1),o.c(),it(o,1),o.m(e.mount(),e.anchor),_=!0),e.block=o,e.blocks&&(e.blocks[s]=o),_&&H()}if(ut(t)){const i=q();if(t.then(s=>{m(i),c(e.then,1,e.value,s),m(null)},s=>{if(m(i),c(e.catch,2,e.error,s),m(null),!e.hasCatch)throw s}),e.current!==e.pending)return c(e.pending,0),!0}else{if(e.current!==e.then)return c(e.then,1,e.value,t),!0;e.resolved=t}}function _e(t,e,n){const c=e.slice(),{resolved:i}=t;t.current===t.then&&(c[t.value]=i),t.current===t.catch&&(c[t.error]=i),t.block.p(c,n)}function de(t,e){const n={},c={},i={$$scope:1};let s=t.length;for(;s--;){const r=t[s],u=e[s];if(u){for(const l in r)l in u||(c[l]=1);for(const l in u)i[l]||(n[l]=u[l],i[l]=1);t[s]=u}else for(const l in r)i[l]=1}for(const r in c)r in n||(n[r]=void 0);return n}function he(t){return typeof t=="object"&&t!==null?t:{}}function me(t){t&&t.c()}function pe(t,e){t&&t.l(e)}function Dt(t,e,n,c){const{fragment:i,on_mount:s,on_destroy:r,after_update:u}=t.$$;i&&i.m(e,n),c||O(()=>{const l=s.map(K).filter(Q);r?r.push(...l):$(l),t.$$.on_mount=[]}),u.forEach(O)}function Lt(t,e){const n=t.$$;n.fragment!==null&&($(n.on_destroy),n.fragment&&n.fragment.d(e),n.on_destroy=n.fragment=null,n.ctx=[])}function Tt(t,e){t.$$.dirty[0]===-1&&(k.push(t),rt(),t.$$.dirty.fill(0)),t.$$.dirty[e/31|0]|=1<<e%31}function ye(t,e,n,c,i,s,r,u=[-1]){const l=v;m(t);const o=t.$$={fragment:null,ctx:null,props:s,update:E,not_equal:i,bound:I(),on_mount:[],on_destroy:[],on_disconnect:[],before_update:[],after_update:[],context:new Map(e.context||(l?l.$$.context:[])),callbacks:I(),dirty:u,skip_bound:!1,root:e.target||l.$$.root};r&&r(o.root);let _=!1;if(o.ctx=n?n(t,e.props||{},(f,a,...d)=>{const h=d.length?d[0]:a;return o.ctx&&i(o.ctx[f],o.ctx[f]=h)&&(!o.skip_bound&&o.bound[f]&&o.bound[f](h),_&&Tt(t,f)),a}):[],o.update(),_=!0,$(o.before_update),o.fragment=c?c(o.ctx):!1,e.target){if(e.hydrate){_t();const f=$t(e.target);o.fragment&&o.fragment.l(f),f.forEach(xt)}else o.fragment&&o.fragment.c();e.intro&&it(t.$$.fragment),Dt(t,e.target,e.anchor,e.customElement),dt(),H()}m(l)}class ge{$destroy(){Lt(this,1),this.$destroy=E}$on(e,n){const c=this.$$.callbacks[e]||(this.$$.callbacks[e]=[]);return c.push(n),()=>{const i=c.indexOf(n);i!==-1&&c.splice(i,1)}}$set(e){this.$$set&&!ot(e)&&(this.$$.skip_bound=!0,this.$$set(e),this.$$.skip_bound=!1)}}export{he as A,Lt as B,st as C,oe as D,E,It as F,Gt as G,Jt as H,Wt as I,bt as J,Bt as K,ce as L,Kt as M,Zt as N,Vt as O,Ht as P,Ft as Q,O as R,ge as S,ae as T,$ as U,Qt as V,fe as W,_e as X,$t as a,te as b,ee as c,xt as d,tt as e,ie as f,Ut as g,vt as h,ye as i,re as j,Xt as k,Yt as l,ne as m,Rt as n,Pt as o,Ot as p,it as q,ue as r,zt as s,F as t,se as u,le as v,me as w,pe as x,Dt as y,de as z};
