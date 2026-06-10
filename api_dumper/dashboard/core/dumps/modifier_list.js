const name       = "modifier_list";
const command    = "dump_modifier_list";
const outputPath = "vscripts/CDOTA_Buff/modifier_list.json";
const layout     = "modifier-list";

function parseLines(lines) {
    const data = lines
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

module.exports = { name, command, outputPath, layout, process: parseLines };