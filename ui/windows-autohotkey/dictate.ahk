; dictate — AutoHotkey v2 front end for Windows.
; UNTESTED: written but never run on a real Windows machine. Reports welcome.
;
;   Ctrl+Alt+D   start / stop recording  ->  the text is on your clipboard
;   Ctrl+Alt+R   transcribe the same audio again
;
; Scan codes (SC020 = D, SC013 = R) bind the physical keys, so the hotkeys keep
; working under a Persian or any non-Latin keyboard layout.
#Requires AutoHotkey v2.0
#SingleInstance Force

REPO := EnvGet("USERPROFILE") "\dictate"            ; <- where you cloned the repo
STOP_FILE := EnvGet("TEMP") "\dictate-hold.stop"    ; passed to the CLI as DICTATE_STOP_FILE
LAST_CLIP := EnvGet("TEMP") "\dictate-last.ogg"

global recording := false
global busyPid := 0

RunCli(args) {
    global busyPid
    EnvSet("DICTATE_STOP_FILE", STOP_FILE)
    EnvSet("DICTATE_LAST_CLIP", LAST_CLIP)
    ; tsx directly rather than npm, so the CLI's exit code comes back unchanged.
    Run(A_ComSpec ' /c ""' REPO '\node_modules\.bin\tsx.cmd" src\cli.ts ' args '"', REPO, "Hide", &pid)
    busyPid := pid
    SetTimer(WatchCli, 250)
}

WatchCli() {
    global busyPid, recording
    if ProcessExist(busyPid)
        return
    SetTimer(WatchCli, 0)
    busyPid := 0
    recording := false
    ToolTip("✅")
    SetTimer(() => ToolTip(), -1500)
}

^!SC020:: {
    global recording
    if recording {
        FileAppend("", STOP_FILE)
        ToolTip("⏳")
        return
    }
    if busyPid
        return
    recording := true
    ToolTip("🔴")
    RunCli("--hold")
}

^!SC013:: {
    if busyPid
        return
    ToolTip("🔁")
    RunCli("--again")
}
