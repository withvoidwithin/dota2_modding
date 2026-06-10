const name       = "panorama_events";
const command    = "dump_panorama_events";
const outputPath = "panorama/events.json";
const layout     = "panorama-events";

function parseLines(lines) {
    const entries = [];

    for (let i = 0; i < lines.length; i++) {
        const codeMatch = lines[i].match(/^\| <code>(.+?)<\/code>$/);
        if (!codeMatch) continue;

        const signature = codeMatch[1].trim();
        const panelEventRaw = lines[i + 1] ? lines[i + 1].replace(/^\|\s*/, "").trim() : "";
        const description   = lines[i + 2] ? lines[i + 2].replace(/^\|\s*/, "").trim() : "";

        entries.push({
            signature,
            panelEvent: panelEventRaw === "Yes",
            description,
        });

        i += 2;
    }

    return {
        meta: {
            module: name,
            timestamp: new Date().toISOString(),
            count: entries.length,
        },
        data: entries,
    };
}

module.exports = { name, command, outputPath, layout, process: parseLines };