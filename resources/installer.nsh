; ====================================================================
; Guidegram NSIS Custom Installer Extension
; Data Shield & Directory Protection Engine
; ====================================================================

!macro customRemoveFiles
  ; CRITICAL DATA SHIELD:
  ; NEVER recursively wipe installation directory!
  ; Only delete application runtime binaries and assets, preserving
  ; the 'data' directory (sessions, accounts, settings, caches) and any user files intact.
  DetailPrint "Guidegram Data Shield: Preserving user sessions, config and data folder..."

  ; Remove only Guidegram app assets and runtime binaries
  RMDir /r "$INSTDIR\locales"
  RMDir /r "$INSTDIR\resources"
  Delete "$INSTDIR\Guidegram.exe"
  Delete "$INSTDIR\*.dll"
  Delete "$INSTDIR\*.bin"
  Delete "$INSTDIR\*.pak"
  Delete "$INSTDIR\*.dat"
  Delete "$INSTDIR\LICENSE*"
  Delete "$INSTDIR\version"
  Delete "$INSTDIR\vk_swiftshader_icd.json"
  Delete "$INSTDIR\vulkan-1.dll"
  Delete "$INSTDIR\Uninstall Guidegram.exe"
!macroend

!macro customInstall
  ; Ensure data directory is created if fresh install
  CreateDirectory "$INSTDIR\data"
  CreateDirectory "$INSTDIR\data\sessions"
!macroend
