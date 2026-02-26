function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.style.left = sidebar.style.left === '0px' ? '-250px' : '0px';
}

function openChat(customerId, customerName) {
    
    document.getElementById('customerName').textContent = customerName;
    document.getElementById('customerId').textContent = customerId;
    
    
    let messages = [];
    
    if (customerId === '1') {  
        messages = [
            { sender: 'customer', text: 'Hello, I need help with my car customization.', time: '10:00 AM' },
            { sender: 'provider', text: 'Hi Rohith, sure! What do you need help with?', time: '10:05 AM' },
        ];
    } else if (customerId === '2') { 
        messages = [
            { sender: 'customer', text: 'I\'m interested in getting custom rims for my car.', time: '11:30 AM' },
            { sender: 'provider', text: 'Hi Siva, we have several options for custom rims. What car model do you have?', time: '11:35 AM' },
        ];
    } else {
      
        messages = [
            { sender: 'customer', text: 'Hello there.', time: '09:00 AM' },
            { sender: 'provider', text: `Hi ${customerName}, how can I help you today?`, time: '09:05 AM' },
        ];
    }
    
    
    messages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', message.sender);
        messageElement.innerHTML = `
            <img src="${message.sender === 'customer' ? '/public/images3/customer.jpg' : '/public/images3/image5.jpg'}" alt="Avatar" class="avatar">
            <div class="message-content">
                <p>${message.text}</p>
                <span class="message-time">${message.time}</span>
            </div>
        `;
        chatMessages.appendChild(messageElement);
    });
    
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    
    if (chatInput.value.trim() === '') return;
    
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'provider');
    messageElement.innerHTML = `
        <img src="/public/images3/image5.jpg" alt="Avatar" class="avatar">
        <div class="message-content">
            <p>${chatInput.value}</p>
            <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
    `;
    chatMessages.appendChild(messageElement);
   
   
    chatInput.value = '';
    
  
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
}


window.onload = () => {
    openChat('1', 'Rohith');
};