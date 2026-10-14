-- dictate — Hammerspoon front end.
--
-- Copy this file to ~/.hammerspoon/init.lua (or `require` it from there), set
-- REPO below, and reload the config. Hammerspoon needs Accessibility permission.
--
--   Ctrl+Alt+D   start / stop recording  →  the text is on your clipboard
--   Ctrl+Alt+R   transcribe the same audio again
--
-- The hotkeys bind to raw keycodes (the physical D and R keys), not to the
-- characters, so they keep working under a Persian or any non-Latin layout.

local REPO = os.getenv("HOME") .. "/dictate"     -- ← where you cloned the repo
local STOP_FILE = "/tmp/dictate-hold.stop"       -- must match DICTATE_STOP_FILE

local KEY_D, KEY_R = 2, 15                        -- ANSI keycodes; layout-independent
local MODS = { "ctrl", "alt" }

-- The few strings this UI shows itself. (The CLI's are in src/messages.ts.)
local T = {
  recording   = "در حال ضبط",
  working     = "در حال تبدیل…",
  retrying    = "دوباره…",
  copied      = "✅ روی کلیپ‌بورد است",
  silent      = "🤫 صدایی شنیده نشد",
  failed      = "❌ نشد — جزئیات در Console هم‌راسپون",
  busy        = "صبر کن، هنوز تمام نشده",
}

---------------------------------------------------------------------------

local state = "idle"     -- idle | recording | working
local task, startedAt, timer
local level = 0          -- 0..1 for the meter

local menubar = hs.menubar.new()
local function setIcon()
  menubar:setTitle(state == "recording" and "🔴" or state == "working" and "⏳" or "🎙️")
end

-- Floating card -------------------------------------------------------------

local W, H = 260, 64
local card
local function buildCard()
  local f = hs.screen.mainScreen():frame()
  card = hs.canvas.new({ x = f.x + (f.w - W) / 2, y = f.y + f.h - H - 80, w = W, h = H })
  card:level(hs.canvas.windowLevels.overlay)
  card:behavior({ "canJoinAllSpaces", "stationary" })
  card[1] = { type = "rectangle", action = "fill", roundedRectRadii = { xRadius = 16, yRadius = 16 },
              fillColor = { white = 0.08, alpha = 0.88 } }
  card[2] = { type = "circle", action = "fill", center = { x = 26, y = 24 }, radius = 6,
              fillColor = { red = 1, green = 0.27, blue = 0.27 } }
  card[3] = { type = "text", frame = { x = 42, y = 12, w = W - 56, h = 24 }, text = "",
              textColor = { white = 1 }, textSize = 15, textAlignment = "right" }
  -- level meter: track + fill
  card[4] = { type = "rectangle", action = "fill", frame = { x = 16, y = 44, w = W - 32, h = 6 },
              roundedRectRadii = { xRadius = 3, yRadius = 3 }, fillColor = { white = 1, alpha = 0.15 } }
  card[5] = { type = "rectangle", action = "fill", frame = { x = 16, y = 44, w = 0, h = 6 },
              roundedRectRadii = { xRadius = 3, yRadius = 3 }, fillColor = { red = 0.35, green = 0.85, blue = 0.55 } }
end

local function cardText(s) card[3].text = s end

local function redraw()
  if state == "recording" then
    local secs = math.floor(hs.timer.secondsSinceEpoch() - startedAt)
    cardText(string.format("%s  %d:%02d", T.recording, secs // 60, secs % 60))
    -- canvas elements are proxies: assign whole tables, never mutate nested ones
    card[2].fillColor = { red = 1, green = 0.27, blue = 0.27, alpha = (secs % 2 == 0) and 1 or 0.45 }
  end
  card[5].frame = { x = 16, y = 44, w = (W - 32) * level, h = 6 }
end

local function showCard()
  if not card then buildCard() end
  level = 0
  redraw()
  card:show()
  timer = hs.timer.doEvery(0.1, redraw)
end

local function hideCard(after)
  hs.timer.doAfter(after or 0, function() if state == "idle" and card then card:hide() end end)
end

-- Running the CLI -----------------------------------------------------------

-- A login shell gives us the user's PATH (Homebrew ffmpeg, nvm/asdf node).
-- tsx directly rather than `npm run`, so the CLI's exit code reaches us unchanged.
local function runCli(args, onDone)
  local cmd = string.format("cd %q && exec ./node_modules/.bin/tsx src/cli.ts %s", REPO, args)
  local stderr = ""
  task = hs.task.new("/bin/zsh", function(code, _, err)
    task = nil
    onDone(code, stderr .. (err or ""))
  end, function(_, out, err)
    for db in (out or ""):gmatch("LEVEL:(%-?[%d%.]+)") do
      -- map -60..0 dBFS to 0..1
      level = math.max(0, math.min(1, (tonumber(db) + 60) / 60))
    end
    stderr = stderr .. (err or "")
    return true
  end, { "-lc", cmd })
  task:start()
end

local function finish(code, err)
  if timer then timer:stop(); timer = nil end
  state = "idle"; setIcon()
  level = 0; redraw()
  if code == 0 then cardText(T.copied)
  elseif code == 3 then cardText(T.silent)
  else cardText(T.failed); print("dictate: " .. err) end
  hideCard(1.6)
end

local function toggle()
  if state == "recording" then
    -- The CLI polls for this file, then lets ffmpeg close the clip cleanly.
    io.open(STOP_FILE, "w"):close()
    state = "working"; setIcon()
    cardText(T.working); level = 0
  elseif state == "idle" then
    state = "recording"; setIcon()
    startedAt = hs.timer.secondsSinceEpoch()
    showCard()
    runCli("--hold", finish)
  else
    hs.alert.show(T.busy)
  end
end

local function again()
  if state ~= "idle" then return hs.alert.show(T.busy) end
  state = "working"; setIcon()
  showCard()
  cardText(T.retrying)
  runCli("--again", finish)
end

hs.hotkey.bind(MODS, KEY_D, toggle)
hs.hotkey.bind(MODS, KEY_R, again)
menubar:setClickCallback(toggle)
setIcon()
