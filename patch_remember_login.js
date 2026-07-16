const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const initTarget = `  // Set default cashier user automatically on load after users fetched
  useEffect(() => {
    if (availableUsers.length > 0 && !currentUser) {
      // Default to Cashier for ease of demo flow
      const cashier = availableUsers.find(u => u.role === "cashier") || availableUsers[0];
      setCurrentUser(cashier);
    }
  }, [availableUsers]);`;

const initReplacement = `  // Check for saved mobile login state or set default cashier
  useEffect(() => {
    if (availableUsers.length > 0 && !isLoggedIn) {
      const savedUserId = localStorage.getItem('posSavedUserId');
      const savedMode = localStorage.getItem('posSavedLoginMode');
      
      if (savedMode === 'mobile' && savedUserId) {
        const user = availableUsers.find(u => u.id.toString() === savedUserId);
        if (user) {
          setCurrentUser(user);
          setIsLoggedIn(true);
          setLoginMode('mobile');
          setDashboardSubTab("reports");
          setActiveTab("dashboard");
          return;
        }
      }
      
      if (!currentUser) {
        // Default to Cashier for ease of demo flow
        const cashier = availableUsers.find(u => u.role === "cashier") || availableUsers[0];
        setCurrentUser(cashier);
      }
    }
  }, [availableUsers]);`;

code = code.replace(initTarget, initReplacement);

const loginTarget = `        if (loginMode === 'mobile') {
          setDashboardSubTab("reports");
          setActiveTab("dashboard");`;

const loginReplacement = `        if (loginMode === 'mobile') {
          localStorage.setItem('posSavedUserId', user.id.toString());
          localStorage.setItem('posSavedLoginMode', 'mobile');
          setDashboardSubTab("reports");
          setActiveTab("dashboard");`;

code = code.replace(loginTarget, loginReplacement);

const logoutTarget = `              if (currentUser) {
                logAuditEvent("user_logout", currentUser.id, currentUser.id, \`🚪 ผู้ใช้ \${currentUser.name} (\${currentUser.role}) ได้กดออกจากระบบอย่างถูกต้อง\`);
              }
              setIsLoggedIn(false);
              setCurrentUser(null);
              setLoginUsername("");
              setLoginPassword("");
              setCart([]);`;

const logoutReplacement = `              if (currentUser) {
                logAuditEvent("user_logout", currentUser.id, currentUser.id, \`🚪 ผู้ใช้ \${currentUser.name} (\${currentUser.role}) ได้กดออกจากระบบอย่างถูกต้อง\`);
              }
              localStorage.removeItem('posSavedUserId');
              localStorage.removeItem('posSavedLoginMode');
              setIsLoggedIn(false);
              setCurrentUser(null);
              setLoginUsername("");
              setLoginPassword("");
              setCart([]);`;

code = code.replace(logoutTarget, logoutReplacement);

fs.writeFileSync('LabPos-main/src/App.tsx', code);
console.log("Patched login saving");
