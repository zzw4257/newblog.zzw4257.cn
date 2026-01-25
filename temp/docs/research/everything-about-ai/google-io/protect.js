// 保护代码，禁用右键菜单和键盘快捷键
document.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('keydown', function(event) {
    // 禁用Ctrl+U (查看源代码)
    if (event.ctrlKey && event.key === 'u') {
        event.preventDefault();
        return false;
    }
    
    // 禁用Ctrl+S (保存页面)
    if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        return false;
    }
    
    // 禁用F12 (开发者工具)
    if (event.key === 'F12') {
        event.preventDefault();
        return false;
    }
});

// 添加一些额外的保护
(function() {
    // 检测开发者工具
    function detectDevTools() {
        const widthThreshold = window.outerWidth - window.innerWidth > 160;
        const heightThreshold = window.outerHeight - window.innerHeight > 160;
        if (widthThreshold || heightThreshold) {
            document.body.innerHTML = '<h1>禁止查看源码</h1>';
        }
    }
    
    window.addEventListener('resize', detectDevTools);
    setInterval(detectDevTools, 1000);
})();
