function updateStatus(id, online) {
  const el = document.getElementById(id);
  el.textContent = online ? "ONLINE" : "OFFLINE";
  el.className = "status " + (online ? "online" : "offline");
}

function poll() {
  fetch("/api/processes")
    .then(res => res.json())
    .then(data => {
      updateStatus("status-dota",     data.dota);
      updateStatus("status-vconsole", data.vconsole);

      const bothOnline = data.dota && data.vconsole;
      document.getElementById("btn-launch").disabled = bothOnline;
    });
}

function launchAll() {
  fetch("/api/launch/dota",     { method: "POST" });
  fetch("/api/launch/vconsole", { method: "POST" });
}

poll();
setInterval(poll, 1000);