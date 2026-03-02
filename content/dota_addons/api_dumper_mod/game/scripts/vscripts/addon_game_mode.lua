local GameMode = thisEntity
local DumperTag = "@VCONSOLE"

function VConsoleInitCommand(command)
	print(DumperTag.."."..command)
end

VConsoleInitCommand("DUMP_MODIFIERS")