import { spawn } from "child_process"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  "https://ntxhotonzsrcqaddaoed.supabase.co",
  "sb_publishable_qYmOkaQNL-1myiRCJfAuRA_Z4zbf2jl"
)

console.log("Starting packet capture...")

const tshark = spawn("C:\\Program Files\\Wireshark\\tshark.exe", [
  "-i", "5",
  "-T", "fields",
  "-e", "ip.src",
  "-e", "ip.dst",
  "-e", "ip.proto"
])

tshark.stdout.on("data", async (data) => {

  const lines = data.toString().split("\n")

  for(const line of lines){

    const parts = line.split("\t")

    if(parts.length >= 3){

      const src = parts[0]
      const dst = parts[1]
      const proto = parts[2]

      console.log("Captured:", src, dst, proto)

      await supabase.from("traffic_metadata").insert([{
        source_ip: src,
        destination_ip: dst,
        protocol: proto
      }])

    }

  }

})