---- ════════════════════════════════════════════════════════════════
----        Copyright © WITHVOIDWITHIN — All rights reserved.
----         https://steamcommunity.com/id/withvoidwithin/
----               https://withvoidwithin.github.io/
---- ════════════════════════════════════════════════════════════════

local GameMode = thisEntity
local DumperTag = "@VCONSOLE"

function VConsoleInitCommand(command)
	print(DumperTag.."."..command)
end

VConsoleInitCommand("DUMP_MODIFIERS")