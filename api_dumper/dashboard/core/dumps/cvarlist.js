const name       = "cvarlist";
const command    = "cvarlist";
const outputPath = "cvarlist.json";
const layout     = "cvarlist";

function parseLines(lines) {
    const data = [];

    for (const line of lines) {
        const normalizedLine = line.replace(/\s+:\s*$/, ' : ');
        const parts = normalizedLine.split(' : ');

        if (parts.length < 2) continue;

        const cvarName    = parts[0].trim();
        const value       = parts[1].trim();
        const flagsRaw    = parts[2] ? parts[2].trim() : "";
        const description = parts.slice(3).join(" : ").trim();

        if (!cvarName) continue;

        data.push({
            name: cvarName,
            value,
            flags: flagsRaw ? flagsRaw.split(",").map(f => f.trim()).filter(Boolean) : [],
            description,
        });
    }

    return {
        meta: {
            module: name,
            timestamp: new Date().toISOString(),
            count: data.length,
        },
        data,
    };
}

module.exports = { name, command, outputPath, layout, process: parseLines };