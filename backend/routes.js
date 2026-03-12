import express from "express"
import multer from "multer"
import fs from "fs"
import path from "path"
import { analyzePcap } from "./analyzer.js"
import supabase from "./supabaseClient.js"

const router = express.Router()

// SSE clients for real-time threat notifications
const sseClients = new Set()

router.get("/threats/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  })
  res.write("data: {\"type\":\"connected\",\"severity\":\"info\",\"ip\":\"-\",\"detail\":\"Real-time threat stream connected\",\"timestamp\":\"" + new Date().toISOString() + "\"}\n\n")
  sseClients.add(res)
  req.on("close", () => sseClients.delete(res))
})

function broadcastThreat(threat) {
  const msg = `data: ${JSON.stringify(threat)}\n\n`
  for (const client of sseClients) {
    try { client.write(msg) } catch { sseClients.delete(client) }
  }
}

// store uploaded PCAP files
const upload = multer({ dest: "uploads/" })

// Persist upload history to a JSON file so it survives restarts
const historyFile = path.join(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1'), "upload_history.json")
let uploadHistory = []
try {
  if (fs.existsSync(historyFile)) {
    uploadHistory = JSON.parse(fs.readFileSync(historyFile, "utf-8"))
  }
} catch { uploadHistory = [] }

function saveHistory() {
  try { fs.writeFileSync(historyFile, JSON.stringify(uploadHistory, null, 2)) } catch {}
}


/*
UPLOAD PCAP
*/
router.post("/upload", upload.single("pcap"), async (req,res)=>{

try{

if(!req.file){
return res.status(400).json({error:"No file uploaded"})
}

const user_id = req.body.user_id || req.query.user_id || null

console.log("PCAP received:", req.file.path, "user:", user_id)

// analyze packets
const packets = await analyzePcap(req.file.path)

console.log("Packets extracted:", packets.length)

// Real-time threat detection during upload — broadcast each threat as it's found
const TOR_EXIT_NODES_RT = new Set([
  "185.220.100.240","185.220.100.241","185.220.100.242","185.220.100.243",
  "185.220.100.244","185.220.100.245","185.220.100.246","185.220.100.247",
  "185.220.100.248","185.220.100.249","185.220.100.250","185.220.100.251",
  "185.220.100.252","185.220.100.253","185.220.100.254","185.220.100.255",
  "176.10.99.200","176.10.104.240","198.98.56.149","199.195.250.77",
  "104.244.76.13","104.244.76.26","109.70.100.1","109.70.100.2",
])
const SUSPICIOUS_PROTOS_RT = new Set(["IRC","TELNET","Telnet","SOCKS","TOR","tor"])
const rtSeenIPs = {}
packets.forEach((pkt, idx) => {
  const dip = pkt.destination_ip
  const sip = pkt.source_ip
  const proto = (pkt.protocol || "unknown").trim()
  const now = new Date().toISOString()

  // Tor detection
  if (TOR_EXIT_NODES_RT.has(dip) || TOR_EXIT_NODES_RT.has(sip)) {
    broadcastThreat({ type: "TOR_NETWORK", severity: "critical", ip: TOR_EXIT_NODES_RT.has(dip) ? dip : sip, detail: "Tor exit node communication detected", timestamp: now })
  }
  // Suspicious protocol
  if (SUSPICIOUS_PROTOS_RT.has(proto)) {
    broadcastThreat({ type: "SUSPICIOUS_PROTOCOL", severity: "high", ip: dip, detail: `${proto} protocol detected in packet #${idx + 1}`, timestamp: now })
  }
  // Track IP frequency for burst alerts
  rtSeenIPs[dip] = (rtSeenIPs[dip] || 0) + 1
  if (rtSeenIPs[dip] === 20) {
    broadcastThreat({ type: "HIGH_FREQUENCY", severity: "high", ip: dip, detail: `${rtSeenIPs[dip]}+ connections to ${dip} — elevated activity`, timestamp: now })
  }
  if (rtSeenIPs[dip] === 50) {
    broadcastThreat({ type: "HIGH_FREQUENCY", severity: "critical", ip: dip, detail: `${rtSeenIPs[dip]}+ connections to ${dip} — possible C2 beaconing`, timestamp: now })
  }
})

// insert packets into Supabase in batches with user_id
let insertError = null
for(let i = 0; i < packets.length; i += 500){
  const batch = packets.slice(i, i + 500).map(p => ({ ...p, use_id: user_id }))
  const { error } = await supabase
    .from("traffic_metadata")
    .insert(batch)
  if(error){
    console.error("Supabase insert error:", JSON.stringify(error))
    insertError = error
    break
  }
}

if(insertError){
  return res.status(500).json({error: "Database insert failed: " + insertError.message})
}

// Track upload history
uploadHistory.push({
  filename: req.file.originalname,
  packets: packets.length,
  timestamp: new Date().toISOString(),
  user_id: user_id,
})
saveHistory()

// Broadcast upload complete event
broadcastThreat({
  type: "SCAN_COMPLETE",
  severity: "info",
  ip: "-",
  detail: `${req.file.originalname}: ${packets.length} packets analyzed, threats detected in real-time`,
  timestamp: new Date().toISOString(),
})

console.log("Successfully inserted", packets.length, "packets")

res.json({
message:"PCAP analyzed successfully",
packets_inserted: packets.length,
filename: req.file.originalname
})

}catch(err){

console.error(err)
res.status(500).json({error:"analysis failed"})

}

})


/*
GET TRAFFIC DATA
Used by dashboard
*/
router.get("/traffic", async (req,res)=>{

try{

const uid = req.query.user_id
let query = supabase.from("traffic_metadata").select("*")
if(uid) query = query.eq("use_id", uid)
const { data, error } = await query

if(error){
throw error
}

res.json(data)

}catch(err){

console.error(err)
res.status(500).json({error:"fetch failed"})

}

})


/*
PART B ANALYSIS
Find most frequent communication endpoints
*/
router.get("/analysis/partyB", async (req,res)=>{

try{

const uid = req.query.user_id
let query = supabase.from("traffic_metadata").select("*")
if(uid) query = query.eq("use_id", uid)
const { data, error } = await query

if(error){
throw error
}

const ipCount = {}

data.forEach(packet => {

const ip = packet.destination_ip

if(!ipCount[ip]){
ipCount[ip] = 0
}

ipCount[ip] += 1

})

const sorted = Object.entries(ipCount)
.sort((a,b)=> b[1] - a[1])

const result = sorted.slice(0,5).map(item => ({
destination_ip: item[0],
communication_count: item[1]
}))

res.json(result)

}catch(err){

console.error(err)
res.status(500).json({error:"partyB analysis failed"})

}

})


/*
SUSPICIOUS IP DETECTION
Detect endpoints with unusually high communication
*/
router.get("/analysis/suspicious", async (req,res)=>{

try{

const uid = req.query.user_id
let query = supabase.from("traffic_metadata").select("*")
if(uid) query = query.eq("use_id", uid)
const { data, error } = await query

if(error){
throw error
}

const ipCount = {}

data.forEach(packet => {

const ip = packet.destination_ip

if(!ipCount[ip]){
ipCount[ip] = 0
}

ipCount[ip] += 1

})

const threshold = 50  // suspicious threshold

const suspicious = Object.entries(ipCount)
.filter(([ip,count]) => count > threshold)
.map(([ip,count]) => ({
destination_ip: ip,
communication_count: count
}))

res.json(suspicious)

}catch(err){

console.error(err)
res.status(500).json({error:"suspicious analysis failed"})

}

})


/*
THREAT DETECTION
Analyze traffic for potential threats based on metadata patterns
*/
router.get("/analysis/threats", async (req,res)=>{

try{

const uid = req.query.user_id
let query = supabase.from("traffic_metadata").select("*")
if(uid) query = query.eq("use_id", uid)
const { data, error } = await query

if(error){
throw error
}

const threats = []
const ipCount = {}
const protocolCount = {}
const ipPairs = {}

// Known Tor exit node IPs (sample list)
const TOR_EXIT_NODES = new Set([
  "185.220.100.240","185.220.100.241","185.220.100.242","185.220.100.243",
  "185.220.100.244","185.220.100.245","185.220.100.246","185.220.100.247",
  "185.220.100.248","185.220.100.249","185.220.100.250","185.220.100.251",
  "185.220.100.252","185.220.100.253","185.220.100.254","185.220.100.255",
  "185.220.101.1","185.220.101.2","185.220.101.3","185.220.101.4",
  "176.10.99.200","176.10.104.240","198.98.56.149","199.195.250.77",
  "104.244.76.13","104.244.76.26","109.70.100.1","109.70.100.2",
  "109.70.100.3","109.70.100.4","109.70.100.5","109.70.100.6",
  "62.102.148.68","62.102.148.69","51.15.43.205","45.66.33.45",
])

// Known malware C2 / suspicious IPs
const MALWARE_IPS = new Set([
  "23.227.38.64","185.234.216.0","91.215.85.0","45.153.203.0",
  "194.26.192.0","5.188.86.0","212.193.30.0","185.143.223.0",
])

// Suspicious protocols associated with attacks
const SUSPICIOUS_PROTOCOLS = new Set([
  "IRC","TELNET","Telnet","SOCKS","TOR","tor",
])

// DNS tunneling indicators
const DNS_TUNNEL_PROTOCOLS = new Set(["DNS","MDNS","LLMNR"])
let dnsCount = 0

data.forEach(packet => {
  const dip = packet.destination_ip
  const sip = packet.source_ip
  const proto = (packet.protocol || "unknown").trim()

  ipCount[dip] = (ipCount[dip] || 0) + 1
  protocolCount[proto] = (protocolCount[proto] || 0) + 1
  if(DNS_TUNNEL_PROTOCOLS.has(proto)) dnsCount++

  const pair = `${sip}->${dip}`
  ipPairs[pair] = (ipPairs[pair] || 0) + 1

  // Tor exit node detection
  if(TOR_EXIT_NODES.has(dip) || TOR_EXIT_NODES.has(sip)){
    threats.push({
      type: "TOR_NETWORK",
      severity: "critical",
      ip: TOR_EXIT_NODES.has(dip) ? dip : sip,
      detail: `Tor exit node communication detected — anonymized traffic routing`,
      count: 1,
      timestamp: new Date().toISOString()
    })
  }

  // Known malware C2 IP detection
  const dipPrefix = dip.split(".").slice(0,3).join(".")+".0"
  const sipPrefix = sip.split(".").slice(0,3).join(".")+".0"
  if(MALWARE_IPS.has(dip) || MALWARE_IPS.has(sip) || MALWARE_IPS.has(dipPrefix) || MALWARE_IPS.has(sipPrefix)){
    threats.push({
      type: "MALWARE_C2",
      severity: "critical",
      ip: MALWARE_IPS.has(dip) || MALWARE_IPS.has(dipPrefix) ? dip : sip,
      detail: `Communication with known malware C2 infrastructure detected`,
      count: 1,
      timestamp: new Date().toISOString()
    })
  }

  // Suspicious protocol detection
  if(SUSPICIOUS_PROTOCOLS.has(proto)){
    threats.push({
      type: "SUSPICIOUS_PROTOCOL",
      severity: "high",
      ip: dip,
      detail: `${proto} protocol detected — commonly used in attacks`,
      count: 1,
      timestamp: new Date().toISOString()
    })
  }
})

// DNS tunneling detection (high volume DNS = possible exfiltration)
if(dnsCount > data.length * 0.4 && dnsCount > 10){
  threats.push({
    type: "DNS_TUNNELING",
    severity: "critical",
    ip: "multiple",
    detail: `${dnsCount}/${data.length} packets are DNS — possible DNS tunneling / data exfiltration`,
    count: dnsCount,
    timestamp: new Date().toISOString()
  })
}

// Detect high-frequency communication (possible C2 beaconing) — lowered thresholds
Object.entries(ipCount).forEach(([ip,count]) => {
  if(count > 20){
    threats.push({
      type: "HIGH_FREQUENCY",
      severity: count > 50 ? "critical" : "high",
      ip: ip,
      detail: `${count} connections detected — possible C2 beaconing or scanning`,
      count: count,
      timestamp: new Date().toISOString()
    })
  } else if(count > 10){
    threats.push({
      type: "ELEVATED_TRAFFIC",
      severity: "warning",
      ip: ip,
      detail: `${count} connections — elevated communication volume`,
      count: count,
      timestamp: new Date().toISOString()
    })
  }
})

// Detect unknown protocols (potential covert channels)
Object.entries(protocolCount).forEach(([proto,count]) => {
  if(proto === "unknown" && count > 2){
    threats.push({
      type: "UNKNOWN_PROTOCOL",
      severity: "high",
      ip: "multiple",
      detail: `${count} packets with unidentified protocol — possible covert channel`,
      count: count,
      timestamp: new Date().toISOString()
    })
  }
})

// Detect suspicious communication pairs
Object.entries(ipPairs).forEach(([pair,count]) => {
  if(count > 10){
    const [src,dst] = pair.split("->")
    threats.push({
      type: "PAIR_ANOMALY",
      severity: count > 30 ? "critical" : "warning",
      ip: dst,
      detail: `${src} → ${dst}: ${count} repeated sessions — possible data exfiltration`,
      count: count,
      timestamp: new Date().toISOString()
    })
  }
})

// Deduplicate Tor/Malware threats by IP
const seen = new Set()
const deduped = threats.filter(t => {
  if(t.type === "TOR_NETWORK" || t.type === "MALWARE_C2" || t.type === "SUSPICIOUS_PROTOCOL"){
    const key = `${t.type}-${t.ip}`
    if(seen.has(key)) return false
    seen.add(key)
  }
  return true
})

// Sort by severity
const severityOrder = { critical: 0, high: 1, warning: 2 }
deduped.sort((a,b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3))

res.json(deduped)

}catch(err){

console.error(err)
res.status(500).json({error:"threat analysis failed"})

}

})


/*
UPLOAD HISTORY
Return list of uploaded files
*/
router.get("/uploads/history", (req,res)=>{
  const uid = req.query.user_id
  if(uid) {
    res.json(uploadHistory.filter(h => h.user_id === uid))
  } else {
    res.json(uploadHistory)
  }
})


export default router