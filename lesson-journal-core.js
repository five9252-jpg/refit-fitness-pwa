/* Pure validation, chronology, EXIF/MP4 timestamps, and bounded vector ink. */
((root)=>{
  'use strict';
  const LIMIT=32*1024*1024;
  const MIME={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','video/mp4':'.mp4','video/webm':'.webm'};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function capture(value) {
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value))return null;
    const full=value.length===16?value+':00':value,parsed=new Date(full+'Z');
    return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,19)===full?full:null;
  }
  function timestampCandidates(text) {
    const found=[];
    for(const match of String(text||'').slice(0,20000).matchAll(/(20\d{2})\s*[년.\-/:]\s*(\d{1,2})\s*[월.\-/:]\s*(\d{1,2})\s*일?\s*(?:[T,]|\s)\s*(?:(오전|오후|AM|PM)\s*)?(\d{1,2})\s*[:시]\s*(\d{2})(?:\s*[:분]\s*(\d{2}))?/gi)) {
      let hour=Number(match[5]);const meridiem=match[4]?.toUpperCase();
      if(meridiem){if(hour<1||hour>12)continue;hour=hour%12+(['오후','PM'].includes(meridiem)?12:0);}
      const value=capture(`${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}T${String(hour).padStart(2,'0')}:${match[6]}:${match[7]||'00'}`);
      if(value&&!found.includes(value))found.push(value);
    }
    return found;
  }
  function validateFile(file) {
    if(!MIME[file?.type])throw Error('JPG·PNG·WebP 사진 또는 MP4·WebM 동영상을 선택해주세요. HEIC/MOV는 변환 후 첨부해주세요.');
    if(!Number.isFinite(file.size)||file.size<1||file.size>LIMIT)throw Error('파일 한 개는 32MB 이하로 선택해주세요.');
    return {kind:file.type.startsWith('image/')?'image':'video',extension:MIME[file.type]};
  }
  function order(rows,mode='capture') {
    return [...rows].sort((a,b)=>{
      if(mode==='capture') {const ac=capture(a.capture_local?.replace(' ','T')),bc=capture(b.capture_local?.replace(' ','T'));if(ac&&bc&&ac!==bc)return ac.localeCompare(bc);if(Boolean(ac)!==Boolean(bc))return ac?-1:1;}
      if(mode==='manual'&&Number(a.position)!==Number(b.position))return Number(a.position)-Number(b.position);
      return String(a.created_at||'').localeCompare(String(b.created_at||''))||String(a.id).localeCompare(String(b.id));
    });
  }
  function cleanInk(strokes) {
    if(!Array.isArray(strokes))return [];
    let total=0;
    return strokes.slice(0,250).flatMap(stroke=>{
      if(!stroke||!Array.isArray(stroke.points)||!['pen','line','arrow','ellipse'].includes(stroke.tool))return [];
      const points=stroke.points.slice(0,2000).filter(p=>Array.isArray(p)&&p.length>=2&&p.every(Number.isFinite)).slice(0,Math.max(0,20000-total)).map(([x,y,p=.5])=>[Math.max(0,Math.min(1,x)),Math.max(0,Math.min(1,y)),Math.max(.1,Math.min(1,p))]);total+=points.length;
      if(points.length<2)return [];
      return [{tool:stroke.tool,color:/^#[0-9a-f]{6}$/i.test(stroke.color)?stroke.color:'#15534c',width:Number.isFinite(stroke.width)?Math.min(.025,Math.max(.001,stroke.width)):.004,points}];
    });
  }
  function draw(ctx,strokes,w,h) {
    for(const stroke of cleanInk(strokes)) {
      const pts=stroke.points.map(p=>[p[0]*w,p[1]*h,p[2]]),a=pts[0],b=pts.at(-1);
      ctx.strokeStyle=stroke.color;ctx.lineWidth=stroke.width*w;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
      if(stroke.tool==='ellipse')ctx.ellipse((a[0]+b[0])/2,(a[1]+b[1])/2,Math.max(1,Math.abs(a[0]-b[0])/2),Math.max(1,Math.abs(a[1]-b[1])/2),0,0,Math.PI*2);
      else {ctx.moveTo(a[0],a[1]);if(stroke.tool==='pen')pts.slice(1).forEach(p=>ctx.lineTo(p[0],p[1]));else ctx.lineTo(b[0],b[1]);}
      ctx.stroke();
      if(stroke.tool==='arrow'){const angle=Math.atan2(b[1]-a[1],b[0]-a[0]),size=Math.max(12,stroke.width*w*4);ctx.beginPath();ctx.moveTo(b[0]-size*Math.cos(angle-.5),b[1]-size*Math.sin(angle-.5));ctx.lineTo(b[0],b[1]);ctx.lineTo(b[0]-size*Math.cos(angle+.5),b[1]-size*Math.sin(angle+.5));ctx.stroke();}
    }
  }
  function erase(strokes,point,radius=.025) {
    const distance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
    return strokes.filter(stroke=>{
      const pts=stroke.points,a=pts[0],b=pts.at(-1);if(stroke.tool==='ellipse'){const rx=Math.max(.001,Math.abs(a[0]-b[0])/2),ry=Math.max(.001,Math.abs(a[1]-b[1])/2),cx=(a[0]+b[0])/2,cy=(a[1]+b[1])/2;return Math.abs(Math.hypot((point[0]-cx)/rx,(point[1]-cy)/ry)-1)*Math.min(rx,ry)>radius;}
      return !(stroke.tool==='pen'?pts.slice(1).some((p,i)=>distance(point,pts[i],p)<=radius):distance(point,a,b)<=radius);
    });
  }
  function jpegTime(buffer) {
    try {
      const v=new DataView(buffer),len=v.byteLength;if(len<4||v.getUint16(0)!==0xffd8)return null;
      let at=2;
      while(at+4<len){const marker=v.getUint16(at);if(marker===0xffda||marker===0xffd9)break;const size=v.getUint16(at+2);if(size<2||at+2+size>len)break;
        if(marker===0xffe1&&v.getUint32(at+4)===0x45786966&&v.getUint16(at+8)===0){
          const base=at+10,little=v.getUint16(base)===0x4949;if(!little&&v.getUint16(base)!==0x4d4d)return null;
          const u16=p=>v.getUint16(base+p,little),u32=p=>v.getUint32(base+p,little);if(u16(2)!==42)return null;
          const readIFD=offset=>{if(offset<8||base+offset+2>len)return null;const count=Math.min(u16(offset),256);for(let i=0;i<count;i++){const p=offset+2+i*12;if(base+p+12>len)return null;const tag=u16(p);if(tag===0x8769){const value=readIFDExif(u32(p+8));if(value)return value;}}return null;};
          const readIFDExif=offset=>{if(offset<8||base+offset+2>len)return null;const count=Math.min(u16(offset),256);for(let i=0;i<count;i++){const p=offset+2+i*12;if(base+p+12>len)return null;if(u16(p)===0x9003&&u16(p+2)===2&&u32(p+4)>=19&&u32(p+4)<=40){const start=base+u32(p+8);if(start+19>len)return null;const text=String.fromCharCode(...new Uint8Array(buffer,start,19));const value=capture(text.replace(/^(\d{4}):(\d{2}):(\d{2}) /,'$1-$2-$3T'));if(value)return value;}}return null;};
          return readIFD(u32(4));
        }at+=2+size;
      }
    }catch{}return null;
  }
  function mp4Time(buffer) {
    try {
      const v=new DataView(buffer),scan=(start,end,depth)=>{if(depth>3)return null;let at=start;
        for(let n=0;n<10000&&at+8<=end;n++){let size=v.getUint32(at),head=8;const type=String.fromCharCode(...new Uint8Array(buffer,at+4,4));if(size===1){if(at+16>end)return null;size=Number(v.getBigUint64(at+8));head=16;}if(size===0)size=end-at;if(size<head||at+size>end)return null;
          if(type==='mvhd'){const pos=at+head;if(pos+12>at+size)return null;const version=v.getUint8(pos);if(![0,1].includes(version))return null;const seconds=version===1?Number(v.getBigUint64(pos+4)):v.getUint32(pos+4);const date=new Date((seconds-2082844800)*1000);if(!Number.isFinite(date.getTime())||date.getUTCFullYear()<2000||date.getUTCFullYear()>2100)return null;return new Date(date.getTime()+9*3600000).toISOString().slice(0,19);}
          if(['moov','trak','mdia'].includes(type)){const value=scan(at+head,at+size,depth+1);if(value)return value;}at+=size;
        }return null;};return scan(0,v.byteLength,0);
    }catch{return null;}
  }
  const api={LIMIT,MIME,esc,capture,timestampCandidates,validateFile,order,cleanInk,draw,erase,jpegTime,mp4Time};root.PacefitLessonCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
