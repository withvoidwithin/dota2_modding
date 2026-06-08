const name = "panorama_css_properties";
const command = "dump_panorama_css_properties";

function parseLines(lines) {
    const entries = [];
    let current = null;

    for (const line of lines) {
        const match = line.match(/^=== (.+) ===$/);
        if (match) {
            if (current) entries.push(current);
            current = { name: match[1].trim(), description: "" };
        } else if (current) {
            if (current.description === "" && line.trim() === "") continue;
            current.description += (current.description ? "\n" : "") + line;
        }
    }
    if (current) entries.push(current);

    const data = entries.map(e => ({
        name: e.name,
        description: e.description.trim(),
    }));

    return {
        meta: {
            module: name,
            timestamp: new Date().toISOString(),
            count: data.length,
        },
        data,
    };
}

module.exports = { name, command, process: parseLines };