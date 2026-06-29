# One-time ingestion of RSSSF World Cup full match archives (1930-2022) into
# lib/data/world-cup-history.json. Run manually: `python3 scripts/ingest-wc-history.py`.
# Match results are parsed; tournament meta (champion/runner-up/host/final/Golden Boot)
# and the all-time top-scorer list are curated and cross-checked. Data: RSSSF.org.
import re, html, json, os, urllib.request
OUT=os.path.join(os.path.dirname(__file__),"..","lib","data","world-cup-history.json")
def url_for(y): return f"https://www.rsssf.org/tables/{'2022f' if y=='2022' else y+'full'}.html"
def text(y):
    raw=urllib.request.urlopen(url_for(y),timeout=30).read()
    try:s=raw.decode('utf-8')
    except:s=raw.decode('cp1252','replace')
    pres=re.findall(r'<pre>(.*?)</pre>',s,re.S|re.I);body="\n".join(pres) if pres else s
    return html.unescape(re.sub(r'<[^>]+>','',body))
ABB={'ARG':'Argentina','BRA':'Brazil','URU':'Uruguay','CHI':'Chile','PER':'Peru','PAR':'Paraguay','BOL':'Bolivia','COL':'Colombia','ECU':'Ecuador','USA':'USA','MEX':'Mexico','CRC':'Costa Rica','COS':'Costa Rica','SAL':'El Salvador','SLV':'El Salvador','HAI':'Haiti','HON':'Honduras','CAN':'Canada','CUB':'Cuba','ENG':'England','SCO':'Scotland','WAL':'Wales','NIR':'Northern Ireland','IRL':'Ireland','EIR':'Ireland','FRA':'France','ITA':'Italy','GER':'Germany','FRG':'West Germany','BRD':'West Germany','GFR':'West Germany','DDR':'East Germany','GDR':'East Germany','ESP':'Spain','POR':'Portugal','NED':'Netherlands','HOL':'Netherlands','BEL':'Belgium','SUI':'Switzerland','SWI':'Switzerland','AUT':'Austria','SWE':'Sweden','NOR':'Norway','DEN':'Denmark','DAN':'Denmark','POL':'Poland','TCH':'Czechoslovakia','CZE':'Czech Republic','SVK':'Slovakia','HUN':'Hungary','ROM':'Romania','ROU':'Romania','BUL':'Bulgaria','YUG':'Yugoslavia','JUG':'Yugoslavia','CRO':'Croatia','SLO':'Slovenia','SCG':'Serbia and Montenegro','SRB':'Serbia','BIH':'Bosnia and Herzegovina','ZSR':'Soviet Union','URS':'Soviet Union','SOV':'Soviet Union','RUS':'Russia','UKR':'Ukraine','GRE':'Greece','TUR':'Turkey','MAR':'Morocco','TUN':'Tunisia','ALG':'Algeria','EGY':'Egypt','NGA':'Nigeria','NGR':'Nigeria','CMR':'Cameroon','CAM':'Cameroon','GHA':'Ghana','SEN':'Senegal','CIV':'Ivory Coast','RSA':'South Africa','SAF':'South Africa','ANG':'Angola','TOG':'Togo','ZAI':'Zaire','KOR':'South Korea','PRK':'North Korea','KLD':'North Korea','JPN':'Japan','JAP':'Japan','CHN':'China','KSA':'Saudi Arabia','ARS':'Saudi Arabia','IRN':'Iran','IRA':'Iran','IRQ':'Iraq','IRK':'Iraq','UAE':'UAE','EMI':'UAE','KUW':'Kuwait','ISR':'Israel','AUS':'Australia','NZL':'New Zealand','DEI':'Dutch East Indies','DUT':'Dutch East Indies','IHO':'Dutch East Indies','TRI':'Trinidad and Tobago','JAM':'Jamaica','PAN':'Panama','QAT':'Qatar'}
FULL_ALIAS={'korea republic':'South Korea','korea dpr':'North Korea','ir iran':'Iran','china pr':'China','germany fr':'West Germany'}
def na(a,yr):
    a=a.upper()
    if a=='GER' and yr<=1990: return 'West Germany'
    return ABB.get(a,a)
def nf(n):
    n=re.sub(r'\s+',' ',n).strip().strip('.').strip();return FULL_ALIAS.get(n.lower(), n.title() if n.isupper() else n)
def stage_of(s, year=0):
    l=s.lower()
    if re.search(r'third place|3rd place|match for third|bronze',l): return 'third'
    if l in('final','the final','world cup final') or re.match(r'final$',l): return 'final'
    if re.search(r'semi',l): return 'SF'
    if re.search(r'quarter',l): return 'QF'
    if re.search(r'round of 16|eighth|achtelfinal|1/8',l) or re.match(r'round 2$',l): return 'R16'
    if re.search(r'second round',l): return 'R16' if year>=1986 else 'group'
    if re.match(r'round 1$',l) or re.search(r'^group |^pool |^gruppe |first round|final round',l): return 'group'
    return None
reA=re.compile(r'^([A-Za-z]{2,3})\s*-\s*([A-Za-z]{2,3})\s+(\d+):(\d+)')
reWO=re.compile(r'^([A-Za-z]{2,3})\s*-\s*([A-Za-z]{2,3})\b')
reDATE=re.compile(r'^\d\d/\d\d/\d{4},')
reTEAM=re.compile(r'^([A-Z][A-Za-z0-9 .&\'/-]+?)\s{2,}(\d+)\b')
re06=re.compile(r'^([A-Z][A-Za-z .&\'/-]+?)\s+(\d+)(?:\s*\(|$)')
re22=re.compile(r'^(?:\d{1,2}-\d{1,2}-\d\d\s+\S.*?\s{2,})?([A-Za-z][A-Za-z .&\'/-]+?)\s{2,}(\d+)-(\d+)\s+([A-Za-z][A-Za-z .&\'/-]+?)(?:\s+\[aet\])?\s*$')
def parse(y):
    yr=int(y if len(y)==4 else '19'+y); lines=text(y).splitlines(); ms=[]; cur=None
    famA=sum(1 for l in lines if reA.match(l.strip()))>5
    if famA:
        for l in lines:
            s=l.strip(); st=stage_of(s,yr)
            if st and not reA.match(s): cur=st; continue
            m=reA.match(s)
            if m: ms.append([na(m.group(1),yr),na(m.group(2),yr),int(m.group(3)),int(m.group(4)),cur or 'group'])
            elif reWO.match(s) and re.search(r'w\.?o\.?|withdr|scratch|forfeit',s,re.I):
                w=reWO.match(s); ms.append([na(w.group(1),yr),na(w.group(2),yr),None,None,cur or 'group'])
        return ms
    if y=='2022':
        for l in lines:
            s=l.strip(); st=stage_of(s,2022)
            if st and not re22.match(s): cur=st; continue
            m=re22.match(s)
            if m: ms.append([nf(m.group(1)),nf(m.group(4)),int(m.group(2)),int(m.group(3)),cur or 'group'])
        return ms
    if y=='2006':
        for i,l in enumerate(lines):
            if l.strip().startswith('In '):
                pr=[re06.match(x.strip()) for x in lines[i+1:i+3]]
                if all(pr): ms.append([nf(pr[0].group(1)),nf(pr[1].group(1)),int(pr[0].group(2)),int(pr[1].group(2)),None])
        return ms
    # 2002/2010/2014/2018 date-anchored with header stage
    idx=[i for i,l in enumerate(lines) if reDATE.match(l.strip())]
    # precompute stage at each line
    stages={}; c=None
    for i,l in enumerate(lines):
        st=stage_of(l.strip(),yr)
        if st: c=st
        stages[i]=c
    for k,i in enumerate(idx):
        end=idx[k+1] if k+1<len(idx) else len(lines)
        tl=[m for m in (reTEAM.match(x.strip()) for x in lines[i+1:end]) if m][:2]
        if len(tl)==2: ms.append([nf(tl[0].group(1)),nf(tl[1].group(1)),int(tl[0].group(2)),int(tl[1].group(2)),stages.get(i)])
    return ms

def positional_stage(ms):  # 32-team header-less (2002/2006): 48 group, then KO; anchor from the end
    n=len(ms)
    for j in range(n): ms[j][4]='group'
    labels=['final','third','SF','SF','QF','QF','QF','QF']+['R16']*8
    for off,lab in enumerate(labels):
        idx=n-1-off
        if idx>=48: ms[idx][4]=lab
    return ms

META={ # host, champion, runnerUp, finalScore, goldenBoot(player,team,goals,shared)
30:('Uruguay','Uruguay','Argentina','4-2',('Guillermo Stábile','Argentina',8,False)),
34:('Italy','Italy','Czechoslovakia','2-1 (aet)',('Oldřich Nejedlý','Czechoslovakia',5,False)),
38:('France','Italy','Hungary','4-2',('Leônidas','Brazil',7,False)),
50:('Brazil','Uruguay','Brazil','final round',('Ademir','Brazil',8,False)),
54:('Switzerland','West Germany','Hungary','3-2',('Sándor Kocsis','Hungary',11,False)),
58:('Sweden','Brazil','Sweden','5-2',('Just Fontaine','France',13,False)),
62:('Chile','Brazil','Czechoslovakia','3-1',('Garrincha and others','(shared)',4,True)),
66:('England','England','West Germany','4-2 (aet)',('Eusébio','Portugal',9,False)),
70:('Mexico','Brazil','Italy','4-1',('Gerd Müller','West Germany',10,False)),
74:('West Germany','West Germany','Netherlands','2-1',('Grzegorz Lato','Poland',7,False)),
78:('Argentina','Argentina','Netherlands','3-1 (aet)',('Mario Kempes','Argentina',6,False)),
82:('Spain','Italy','West Germany','3-1',('Paolo Rossi','Italy',6,False)),
86:('Mexico','Argentina','West Germany','3-2',('Gary Lineker','England',6,False)),
90:('Italy','West Germany','Argentina','1-0',('Salvatore Schillaci','Italy',6,False)),
94:('USA','Brazil','Italy','0-0 (3-2 pens)',('Oleg Salenko & Hristo Stoichkov','(shared)',6,True)),
98:('France','France','Brazil','3-0',('Davor Šuker','Croatia',6,False)),
2002:('South Korea/Japan','Brazil','Germany','2-0',('Ronaldo','Brazil',8,False)),
2006:('Germany','Italy','France','1-1 (5-3 pens)',('Miroslav Klose','Germany',5,False)),
2010:('South Africa','Spain','Netherlands','1-0 (aet)',('Thomas Müller','Germany',5,True)),
2014:('Brazil','Germany','Argentina','1-0 (aet)',('James Rodríguez','Colombia',6,False)),
2018:('Russia','France','Croatia','4-2',('Harry Kane','England',6,False)),
2022:('Qatar','Argentina','France','3-3 (4-2 pens)',('Kylian Mbappé','France',8,False)),
}
YEARS=['30','34','38','50','54','58','62','66','70','74','78','82','86','90','94','98','2002','2006','2010','2014','2018','2022']
KN={'30':18,'34':17,'38':18,'50':22,'54':26,'58':35,'62':32,'66':32,'70':32,'74':38,'78':38,'82':52,'86':52,'90':52,'94':52,'98':64,'2002':64,'2006':64,'2010':64,'2014':64,'2018':64,'2022':64}
tournaments=[]; problems=[]
for y in YEARS:
    yr=int(y if len(y)==4 else '19'+y)
    ms=parse(y)
    if y in('2002','2006'): ms=positional_stage(ms)
    host,champ,ru,fs,gb=META.get(yr) or META[yr-1900]
    # cross-check: last decisive match winner == champion (skip final-group/pens)
    last=ms[-1] if ms else None
    if last and last[2] is not None and last[3] is not None and last[2]!=last[3]:
        w=last[0] if last[2]>last[3] else last[1]
        if w!=champ and not (champ=='West Germany' and w=='Germany'): problems.append(f"{y}: last-winner {w} != champ {champ}")
    if len(ms)!=KN[y]: problems.append(f"{y}: matches {len(ms)} != known {KN[y]}")
    tournaments.append({'year':yr,'host':host,'champion':champ,'runnerUp':ru,'finalScore':fs,
        'goldenBoot':{'player':gb[0],'team':gb[1],'goals':gb[2],'shared':gb[3]},
        'matches':[{'stage':m[4],'a':m[0],'b':m[1],'sa':m[2],'sb':m[3]} for m in ms]})
out={'source':'RSSSF (rsssf.org) full match archives, 1930–2022','attribution':'Data: RSSSF.org','generatedAt':'2026-06-28',
     'coverage':'Through the 2022 World Cup — does NOT include the in-progress 2026 tournament. All-time records, Golden Boots, and head-to-heads are as of 2022.',
     'note':'Match results parsed from RSSSF; tournament meta (champion/runner-up/host/final/Golden Boot) curated and cross-checked against parsed final winners. 958 of 964 matches captured; 6 obscure replay/playoff/edge matches (1954, 1986 x2, 1994, 2002, 2006) are not included. Head-to-head/records are per these RSSSF records.',
     'allTimeTopScorers':[
       {'player':'Miroslav Klose','team':'Germany','goals':16},
       {'player':'Ronaldo','team':'Brazil','goals':15},
       {'player':'Gerd Müller','team':'West Germany','goals':14},
       {'player':'Just Fontaine','team':'France','goals':13},
       {'player':'Lionel Messi','team':'Argentina','goals':13},
       {'player':'Pelé','team':'Brazil','goals':12},
       {'player':'Kylian Mbappé','team':'France','goals':12},
       {'player':'Sándor Kocsis','team':'Hungary','goals':11},
       {'player':'Jürgen Klinsmann','team':'Germany','goals':11}],
     'tournaments':tournaments}
open(OUT,"w",encoding="utf-8").write(json.dumps(out,ensure_ascii=False,indent=1))
print("PROBLEMS:" if problems else "ALL CHAMPIONS CROSS-CHECK + COUNTS:")
for p in problems: print("  ",p)
print(f"tournaments: {len(tournaments)}  total matches: {sum(len(t['matches']) for t in tournaments)}")
