// Original exp1/exp2 render functions; geometry, HSL CSS, borders, label styles retained.
export let selectedRating = null;
let isTouchDown = false;
export const colors=[];
export function setSelectedRating(value){selectedRating=value;}
export const customColors = [
    { h: 0, s: 100, l: 50, rating: null },   // สีแดง
    { h: 120, s: 100, l: 50, rating: null }, // สีเขียว
    { h: 240, s: 100, l: 50, rating: null }, // สีน้ำเงิน
    { h: 60, s: 100, l: 50, rating: null },  // สีเหลือง
    { h: 180, s: 100, l: 50, rating: null }, // สีฟ้าอมเขียว
    { h: 300, s: 100, l: 50, rating: null }, // สีม่วงแดง
    { h: 30, s: 100, l: 50, rating: null },  // สีส้ม
    { h: 210, s: 100, l: 50, rating: null }, // สีฟ้า
    { h: 90, s: 100, l: 50, rating: null },  // สีเขียวอ่อน
    { h: 270, s: 100, l: 50, rating: null }  // สีม่วง
];
export function renderPage1(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // ล้าง container เดิมออกทั้งหมด

    customColors.forEach((color, index) => {
        const div = document.createElement('li');
        div.id = `color-box-${index}`;
        
        div.className = 'color-box';
        div.style.backgroundColor = `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
        if(color.s === 0 && color.l === 0){
            div.style.border = '0.1px solid #ffffff';
        }else{
            div.style.border = '0.01px solid #000000';
        }

        const ratingLabel = document.createElement('span');

        if (color.rating !== null) {
            ratingLabel.textContent = color.rating;
        }

        // 🎯 กำหนดสีตัวอักษร
        if (color.h === 240) {
            ratingLabel.style.color = 'white'; // น้ำเงิน → ขาว
        } else if (color.l < 50) {
            ratingLabel.style.color = 'white';
        } else {
            ratingLabel.style.color = 'black';
        }

        // 🔥 เพิ่มขนาดตัวเลข
        ratingLabel.style.fontSize = '1.5vw';
        ratingLabel.style.fontWeight = 'bold';

        div.appendChild(ratingLabel);

        // Event สำหรับการให้คะแนน
        div.addEventListener('click', () => {
            if (selectedRating !== null) {
                color.rating = selectedRating; // อัปเดตคะแนนใน customColors
                ratingLabel.textContent = selectedRating; // อัปเดตข้อความในช่องสี
            }
        });

        // Event เมื่อเริ่มแตะ
        div.addEventListener('touchstart', (event) => {
            if (selectedRating !== null) {
                isTouchDown = true;
                color.rating = selectedRating;
                ratingLabel.textContent = selectedRating; // อัปเดตข้อความในช่องสี
                event.preventDefault(); // ป้องกัน default behavior
            }
        });

        // Event สำหรับการลากข้ามช่อง
        div.addEventListener('touchmove', (event) => {
            if (isTouchDown && selectedRating !== null) {
                const touch = event.touches[0];
                const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);

                // ตรวจสอบว่าองค์ประกอบที่แตะเป็น color-box
                if (elementAtPoint && elementAtPoint.classList.contains('color-box')) {
                    const targetIndex = Array.from(container.children).indexOf(elementAtPoint);

                    if (targetIndex >= 0 && targetIndex < customColors.length) {
                        customColors[targetIndex].rating = selectedRating;
                        const targetRatingLabel = container.children[targetIndex].querySelector('span');
                        if (targetRatingLabel) {
                            targetRatingLabel.textContent = selectedRating; // อัปเดตข้อความในช่องสีที่ลากถึง
                        }
                    }
                }
                event.preventDefault(); // ป้องกัน default behavior ระหว่างลาก
            }
        });

        // Event เมื่อสิ้นสุดการแตะ
        div.addEventListener('touchend', () => {
            isTouchDown = false; // รีเซ็ตสถานะการแตะ
        });

        container.appendChild(div);
    });
}


export function renderPage2(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // ล้าง container เดิมออกทั้งหมด

    colors.forEach((color, index) => {
        const div = document.createElement('li');
        div.id = `color-box-${index}`;
        
        div.className = 'color-box';
        div.style.backgroundColor = `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
        if(color.s === 0 && color.l === 0){
            div.style.border = '0.1px solid #ffffff';
        }else{
            div.style.border = '0.01px solid #000000';
        }
        // Event สำหรับการแตะปกติ
        div.addEventListener('click', () => {
            if (selectedRating !== null) {
                color.rating = selectedRating;
                updateColorBoxes(containerId); // อัปเดตช่องสีหลังการให้คะแนน
            }
        });

        // Event เมื่อเริ่มแตะ
        div.addEventListener('touchstart', (event) => {
            if (selectedRating !== null) {
                isTouchDown = true;
                color.rating = selectedRating;
                updateColorBoxes(containerId); // อัปเดตช่องสีหลังการให้คะแนน
                event.preventDefault(); // ป้องกัน default behavior
            }
        });

        // Event สำหรับการลากข้ามช่อง
        div.addEventListener('touchmove', (event) => {
            if (isTouchDown && selectedRating !== null) {
                const touch = event.touches[0];
                const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);

                // ตรวจสอบว่าองค์ประกอบที่แตะเป็น color-box
                if (elementAtPoint && elementAtPoint.classList.contains('color-box')) {
                    const targetIndex = Array.from(container.children).indexOf(elementAtPoint);

                    if (targetIndex >= 0 && targetIndex < colors.length) {
                        colors[targetIndex].rating = selectedRating;
                        updateColorBoxes(containerId); // อัปเดตช่องสีหลังการลาก
                    }
                }
                event.preventDefault(); // ป้องกัน default behavior ระหว่างลาก
            }
        });

        // Event เมื่อสิ้นสุดการแตะ
        div.addEventListener('touchend', () => {
            isTouchDown = false; // รีเซ็ตสถานะการแตะ
        });

        // แสดงคะแนนถ้ามี
        if (color.rating !== null) {
            const ratingLabel = document.createElement('span');
            ratingLabel.textContent = color.rating;
            div.appendChild(ratingLabel);
        }

        container.appendChild(div);
    });
}

export function updateColorBoxes(containerId) {
    const container = document.getElementById(containerId);
    Array.from(container.children).forEach((child, index) => {
        let ratingLabel = child.querySelector('span');
        if (colors[index].rating !== null) {
            if (!ratingLabel) {
                const newRatingLabel = document.createElement('span');
                newRatingLabel.textContent = colors[index].rating;
                // ตั้งค่าสีของตัวอักษรตามเงื่อนไข
                if ((colors[index].l < 49) || (colors[index].h === 240 && colors[index].l < 51)) {
                    newRatingLabel.style.color = 'white';
                } else {
                    newRatingLabel.style.color = 'black';
                }
                child.appendChild(newRatingLabel);
                ratingLabel = newRatingLabel;
            } else {
                ratingLabel.textContent = colors[index].rating;
                // ตั้งค่าสีของตัวอักษรตามเงื่อนไข
                if ((colors[index].l < 49) || (colors[index].h === 240 && colors[index].l < 51)) {
                    ratingLabel.style.color = 'white';
                } else {
                    ratingLabel.style.color = 'black';
                }
            }
            ratingLabel.style.fontSize = '1.4vw';
            ratingLabel.style.fontWeight = 'bold';
        } else if (ratingLabel) {
            ratingLabel.remove();
        }
    });
}

