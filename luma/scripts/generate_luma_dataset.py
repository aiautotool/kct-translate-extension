#!/usr/bin/env python3
"""Generate a deterministic 500k Luma-Vietnamese parallel corpus."""
from __future__ import annotations

import argparse, gzip, hashlib, json, random
from pathlib import Path

SUBJECTS = [("Mi","Tôi"),("Ti","Bạn"),("Li","Người ấy"),("Min","Chúng tôi"),("Tin","Các bạn"),("Lin","Họ"),("Ama","Mẹ"),("Ata","Cha"),("Yuna","Người bạn"),("Dara","Người đó")]
TIMES = [("pa","đã","past"),("na","đang","present"),("va","sẽ","future"),("ya","thường","habitual"),("nu","chưa","not_yet")]
VERBS = [("mira","nhìn thấy"),("sora","lắng nghe"),("sela","yêu quý"),("kala","tạo ra"),("mena","ghi nhớ"),("sila","hiểu"),("ravi","nói về"),("nava","bảo vệ"),("fela","tìm thấy"),("dova","mang theo"),("pira","chọn"),("tela","học"),("vira","chia sẻ"),("sena","gửi"),("lira","đọc"),("yara","viết về"),("bena","mua"),("dela","sửa chữa"),("gala","mở"),("kera","đóng"),("fara","chờ"),("zena","giúp đỡ"),("hira","gọi"),("mora","quan sát"),("rena","gặp")]
OBJECTS = [("ti","bạn"),("mi","tôi"),("luma","ánh sáng"),("domi","ngôi nhà"),("sural","mặt trời"),("lunal","mặt trăng"),("ava","nước"),("tera","mảnh đất"),("yuna","người bạn"),("liba","quyển sách"),("musa","bản nhạc"),("pika","bức ảnh"),("vida","đoạn phim"),("nira","giấc mơ"),("mena","ký ức"),("kala","tác phẩm"),("sora","âm thanh"),("rava","câu chuyện"),("dara","con người"),("flor","bông hoa"),("arba","cái cây"),("mara","con đường"),("nuba","đám mây"),("stela","ngôi sao"),("fira","ngọn lửa"),("vila","ngôi làng"),("sita","thành phố"),("kora","cánh cửa"),("fena","cửa sổ"),("taba","chiếc bàn"),("seda","chiếc ghế"),("pana","món ăn"),("suma","đồ uống"),("tela","bài học"),("lora","lá thư"),("dona","món quà"),("rima","bí mật"),("plana","kế hoạch"),("tema","công việc"),("voka","từ mới")]
ADVERBS = [("",""),("savi","một cách cẩn thận"),("rapi","một cách nhanh chóng"),("lenti","một cách chậm rãi"),("vali","rất tốt"),("keli","một cách khéo léo"),("sili","trong im lặng"),("feli","một cách vui vẻ"),("veri","một cách chân thành"),("navi","mỗi ngày")]

def record(i: int) -> dict:
    # Mixed-radix enumeration guarantees unique grammatical feature tuples.
    n=i; adv=ADVERBS[n%len(ADVERBS)]; n//=len(ADVERBS)
    obj=OBJECTS[n%len(OBJECTS)]; n//=len(OBJECTS)
    verb=VERBS[n%len(VERBS)]; n//=len(VERBS)
    neg=n%2; n//=2; tense=TIMES[n%len(TIMES)]; n//=len(TIMES)
    subj=SUBJECTS[n%len(SUBJECTS)]
    luma=" ".join(x for x in (subj[0],tense[0],"no" if neg else "",verb[0],obj[0],adv[0]) if x)+"."
    if tense[2]=="not_yet": neg=0
    vi=" ".join(x for x in (subj[1],tense[1],"không" if neg else "",verb[1],obj[1],adv[1]) if x)+"."
    return {"id":f"lum-vi-{i+1:06d}","luma":luma,"vi":vi,"split":"","grammar":{"subject":subj[0],"tense":tense[2],"negative":bool(neg),"verb":verb[0],"object":obj[0],"adverb":adv[0] or None},"source":"controlled-synthetic-v1"}

def main():
    p=argparse.ArgumentParser(); p.add_argument("--count",type=int,default=500_000); p.add_argument("--shard-size",type=int,default=50_000); p.add_argument("--output",default="dataset/luma-vi-500k"); a=p.parse_args()
    out=Path(a.output); out.mkdir(parents=True,exist_ok=True); rng=random.Random(20260831)
    order=list(range(a.count)); rng.shuffle(order)
    split_by_id={idx:("train" if pos<int(a.count*.8) else "validation" if pos<int(a.count*.9) else "test") for pos,idx in enumerate(order)}
    manifest={"name":"Luma-Vietnamese 500K","version":"1.0.0","records":a.count,"license":"CC BY 4.0","generator_seed":20260831,"shards":[]}
    for start in range(0,a.count,a.shard_size):
        path=out/f"luma-vi-{start//a.shard_size+1:05d}.jsonl.gz"; h=hashlib.sha256()
        with gzip.open(path,"wt",encoding="utf-8",newline="\n") as f:
            for i in range(start,min(start+a.shard_size,a.count)):
                r=record(i); r["split"]=split_by_id[i]; line=json.dumps(r,ensure_ascii=False,separators=(",",":"))+"\n"; f.write(line)
        h.update(path.read_bytes()); manifest["shards"].append({"file":path.name,"records":min(a.shard_size,a.count-start),"sha256":h.hexdigest(),"bytes":path.stat().st_size})
    (out/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(manifest,ensure_ascii=False,indent=2))
if __name__=="__main__": main()
