// Update Manager Functions for Control Panel
function setNewVersion() {
    const newVersion = document.getElementById('newVersionInput').value;
    if (!newVersion) {
        alert('يرجى إدخال رقم الإصدار');
        return;
    }
    
    if (updateManager.setVersion(newVersion)) {
        document.getElementById('currentVersionDisplay').textContent = newVersion;
        showToast('تم تحديث رقم الإصدار بنجاح', 'success');
    } else {
        showToast('فشل في تحديث الإصدار', 'error');
    }
}

async function pushUpdate() {
    const version = document.getElementById('newVersionInput').value;
    const notes = document.getElementById('updateNotes').value;
    
    if (!version || !notes) {
        alert('يرجى ملء جميع الحقول');
        return;
    }
    
    const updateData = {
        version: version,
        notes: notes,
        update_url: 'https://your-central-server.com/updates/' + version,
        signature: updateManager.generateSignature(version + notes)
    };
    
    const success = await updateManager.pushUpdate(updateData);
    if (success) {
        showToast('تم نشر التحديث بنجاح', 'success');
        loadCompanyVersions();
    } else {
        showToast('فشل في نشر التحديث', 'error');
    }
}

async function checkForUpdatesManually() {
    showToast('يتم فحص التحديثات...', 'info');
    await updateManager.checkForUpdates();
}

async function loadCompanyVersions() {
    const companies = await updateManager.getCompanyVersions();
    const tbody = document.getElementById('companyVersionsBody');
    const currentVersion = updateManager.getCurrentVersion();
    
    tbody.innerHTML = companies.map(company => {
        const isOutdated = updateManager.isNewerVersion(currentVersion, company.version);
        const badgeClass = isOutdated ? 'outdated' : '';
        
        return `
            <tr>
                <td>${company.companyName}</td>
                <td>${company.companyId}</td>
                <td><span class="version-badge ${badgeClass}">${company.version}</span></td>
                <td>${new Date(company.lastUpdate).toLocaleDateString('ar-EG')}</td>
            </tr>
        `;
    }).join('');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        z-index: 10000;
        font-family: 'Cairo', sans-serif;
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Initialize update manager on page load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (typeof updateManager !== 'undefined') {
            document.getElementById('currentVersionDisplay').textContent = updateManager.getCurrentVersion();
            loadCompanyVersions();
        }
    }, 500);
});

// Make update functions globally available
window.setNewVersion = setNewVersion;
window.pushUpdate = pushUpdate;
window.checkForUpdatesManually = checkForUpdatesManually;