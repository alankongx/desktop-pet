Unicode true
Name "大圣喵 3D 桌宠"
OutFile "DashengPet-Setup.exe"
InstallDir "$LOCALAPPDATA\Programs\DashengPet"
RequestExecutionLevel user
SetCompressor /SOLID zlib
Icon "payload/pet.ico"
UninstallIcon "payload/pet.ico"
Caption "安装大圣喵 3D 桌宠"
ShowInstDetails nevershow
!include "x64.nsh"
!define UNKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\DashengPet"
VIProductVersion "2.2.4.0"
VIAddVersionKey "ProductName" "大圣喵 3D 桌宠"
VIAddVersionKey "FileDescription" "大圣喵 Windows 安装程序"
VIAddVersionKey "FileVersion" "2.2.4"
VIAddVersionKey "LegalCopyright" "大圣喵桌宠项目"
Page instfiles
UninstPage uninstConfirm
UninstPage instfiles
AutoCloseWindow true
Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP "这个安装包需要 64 位 Windows。"
    Abort
  ${EndIf}
FunctionEnd
!macro CheckClosed
  retryOpen:
  IfFileExists "$INSTDIR\DashengPet.exe" 0 ready
  ClearErrors
  FileOpen $0 "$INSTDIR\DashengPet.exe" a
  IfErrors locked
  FileClose $0
  Goto ready
  locked:
    MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "请先右键退出正在运行的大圣喵，再点重试。" /SD IDCANCEL IDRETRY retryOpen
    Abort
  ready:
!macroend
Section
  SetShellVarContext current
  !insertmacro CheckClosed
  SetOutPath "$INSTDIR"
  File /r "payload/*"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\大圣喵.lnk" "$INSTDIR\DashengPet.exe" "" "$INSTDIR\pet.ico"
  CreateShortcut "$SMPROGRAMS\大圣喵.lnk" "$INSTDIR\DashengPet.exe" "" "$INSTDIR\pet.ico"
  WriteRegStr HKCU "${UNKEY}" "DisplayName" "大圣喵 3D 桌宠"
  WriteRegStr HKCU "${UNKEY}" "DisplayVersion" "2.2.4"
  WriteRegStr HKCU "${UNKEY}" "DisplayIcon" "$INSTDIR\pet.ico"
  WriteRegStr HKCU "${UNKEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  IfSilent done
  Exec '"$INSTDIR\DashengPet.exe"'
  done:
SectionEnd
Section "Uninstall"
  SetShellVarContext current
  !insertmacro CheckClosed
  Delete "$DESKTOP\大圣喵.lnk"
  Delete "$SMPROGRAMS\大圣喵.lnk"
  DeleteRegKey HKCU "${UNKEY}"
  !include "remove.nsh"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
SectionEnd
