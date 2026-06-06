const name = "modifier_list";
const command = "dump_modifier_list";

function parseLines(lines) {
    const data = lines
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .sort();

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