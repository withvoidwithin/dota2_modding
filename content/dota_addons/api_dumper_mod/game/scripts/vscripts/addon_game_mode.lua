local GameMode = thisEntity
local DumperTag = "@API_DUMPER"

function VConsoleInitCommand(command)
	print(DumperTag.."."..command)
end

VConsoleInitCommand("DUMP.MODIFIERS")