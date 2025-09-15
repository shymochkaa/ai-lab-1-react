import React, { useState, useEffect } from 'react';
import { AlertCircle, Brain, Save, Upload, RotateCcw, Eye, Check, X } from 'lucide-react';

const ObjectRecognitionSystem = () => {
  const [object1Name, setObject1Name] = useState('');
  const [object2Name, setObject2Name] = useState('');
  const [object1Features, setObject1Features] = useState(new Set());
  const [object2Features, setObject2Features] = useState(new Set());
  const [commonFeatures, setCommonFeatures] = useState(new Set());
  const [trained, setTrained] = useState(false);
  
  const [currentStep, setCurrentStep] = useState('training'); 
  const [trainingStep, setTrainingStep] = useState(1); 
  
  const [obj1Input, setObj1Input] = useState('');
  const [obj2Input, setObj2Input] = useState('');
  const [obj1FeaturesInput, setObj1FeaturesInput] = useState('');
  const [obj2FeaturesInput, setObj2FeaturesInput] = useState('');
  const [unknownFeaturesInput, setUnknownFeaturesInput] = useState('');
  
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [selectedCorrection, setSelectedCorrection] = useState('');
  
  const [notifications, setNotifications] = useState([]);
  const [duplicateWarnings, setDuplicateWarnings] = useState([]);

  // Завантаження даних з localStorage при старті
  useEffect(() => {
    const saved = localStorage.getItem('objectRecognitionData');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setObject1Name(data.object1Name || '');
        setObject2Name(data.object2Name || '');
        setObject1Features(new Set(data.object1Features || []));
        setObject2Features(new Set(data.object2Features || []));
        setCommonFeatures(new Set(data.commonFeatures || []));
        setTrained(data.trained || false);
        if (data.trained) {
          setCurrentStep('recognition');
        }
        addNotification('База знань завантажена з локального сховища!', 'success');
      } catch (e) {
        console.error('Помилка завантаження даних:', e);
      }
    }
  }, []);

  // Збереження даних в localStorage
  const saveData = () => {
    const data = {
      object1Name,
      object2Name,
      object1Features: Array.from(object1Features),
      object2Features: Array.from(object2Features),
      commonFeatures: Array.from(commonFeatures),
      trained
    };
    localStorage.setItem('objectRecognitionData', JSON.stringify(data));
  };

  // Додавання повідомлень
  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Виявлення дублікатів у масиві
  const findDuplicates = (features) => {
    const seen = new Set();
    const duplicates = [];
    const unique = [];
    
    features.forEach(feature => {
      const normalized = feature.trim().toLowerCase();
      if (normalized) {
        if (seen.has(normalized)) {
          duplicates.push(feature);
        } else {
          seen.add(normalized);
          unique.push(normalized);
        }
      }
    });
    
    return { unique, duplicates };
  };

  // Обробка початкового навчання - крок 1 (назви об'єктів)
  const handleNamesSubmit = () => {
    if (!obj1Input.trim() || !obj2Input.trim()) {
      addNotification('Будь ласка, введіть назви обох об\'єктів!', 'error');
      return;
    }
    
    setObject1Name(obj1Input.trim());
    setObject2Name(obj2Input.trim());
    setTrainingStep(2);
  };

  // Обробка початкового навчання - крок 2 (ознаки)
  const handleFeaturesSubmit = () => {
    if (!obj1FeaturesInput.trim() && !obj2FeaturesInput.trim()) {
      addNotification('Введіть хоча б одну ознаку для одного з об\'єктів!', 'error');
      return;
    }

    let warnings = [];
    
    // Обробка ознак першого об'єкта
    const obj1FeaturesArray = obj1FeaturesInput.split('\n').filter(f => f.trim());
    const obj1Analysis = findDuplicates(obj1FeaturesArray);
    
    if (obj1Analysis.duplicates.length > 0) {
      warnings.push(`Видалено дублікати з ${object1Name}: ${obj1Analysis.duplicates.join(', ')}`);
    }
    
    // Обробка ознак другого об'єкта
    const obj2FeaturesArray = obj2FeaturesInput.split('\n').filter(f => f.trim());
    const obj2Analysis = findDuplicates(obj2FeaturesArray);
    
    if (obj2Analysis.duplicates.length > 0) {
      warnings.push(`Видалено дублікати з ${object2Name}: ${obj2Analysis.duplicates.join(', ')}`);
    }

    const newObj1Features = new Set(obj1Analysis.unique);
    const newObj2Features = new Set(obj2Analysis.unique);
    
    // Виявлення спільних ознак
    const common = new Set([...newObj1Features].filter(f => newObj2Features.has(f)));
    
    if (common.size > 0) {
      warnings.push(`Знайдено спільні ознаки: ${Array.from(common).join(', ')}. Ці ознаки переміщено до загального списку.`);
      
      // Видалення спільних ознак з індивідуальних списків
      common.forEach(feature => {
        newObj1Features.delete(feature);
        newObj2Features.delete(feature);
      });
    }

    setObject1Features(newObj1Features);
    setObject2Features(newObj2Features);
    setCommonFeatures(common);
    setTrained(true);
    setCurrentStep('recognition');
    
    if (warnings.length > 0) {
      setDuplicateWarnings(warnings);
    }
    
    addNotification('Початкове навчання завершено успішно!', 'success');
    saveData();
  };

  // Розпізнавання об'єкта
  const recognizeObject = (unknownFeatures) => {
    const unknownSet = new Set(unknownFeatures.map(f => f.toLowerCase()));
    
    const obj1Matches = [...unknownSet].filter(f => object1Features.has(f)).length;
    const obj2Matches = [...unknownSet].filter(f => object2Features.has(f)).length;
    const commonMatches = [...unknownSet].filter(f => commonFeatures.has(f)).length;
    
    const totalObj1Score = obj1Matches + commonMatches;
    const totalObj2Score = obj2Matches + commonMatches;
    
    const analysis = `Аналіз ознак:\nЗбіги з ${object1Name}: ${obj1Matches} унікальних + ${commonMatches} спільних = ${totalObj1Score}\nЗбіги з ${object2Name}: ${obj2Matches} унікальних + ${commonMatches} спільних = ${totalObj2Score}`;
    
    let predictedObject, reason;
    
    if (totalObj1Score > totalObj2Score) {
      predictedObject = object1Name;
      reason = 'більше збігів з ознаками';
    } else if (totalObj2Score > totalObj1Score) {
      predictedObject = object2Name;
      reason = 'більше збігів з ознаками';
    } else if (totalObj1Score > 0) {
      predictedObject = object1Name;
      reason = 'однакова кількість збігів, обрано перший об\'єкт';
    } else {
      predictedObject = object1Name;
      reason = 'немає збігів, обрано за замовчуванням';
    }
    
    return { predictedObject, reason, analysis };
  };

  // Обробка розпізнавання
  const handleRecognition = () => {
    if (!unknownFeaturesInput.trim()) {
      addNotification('Будь ласка, введіть ознаки для розпізнавання!', 'error');
      return;
    }
    
    const featuresArray = unknownFeaturesInput.split('\n').filter(f => f.trim());
    const analysis = findDuplicates(featuresArray);
    
    if (analysis.duplicates.length > 0) {
      addNotification(`Виявлено дублікати: ${analysis.duplicates.join(', ')}. Дублікати будуть проігноровані.`, 'warning');
    }
    
    const result = recognizeObject(analysis.unique);
    setRecognitionResult({
      ...result,
      unknownFeatures: analysis.unique
    });
    setShowConfirmation(true);
  };


  const handleConfirmation = (isCorrect) => {
    setShowConfirmation(false);
  
    if (!recognitionResult) return;
  
    const predictedObject = recognitionResult.predictedObject;
    const unknownFeatures = recognitionResult.unknownFeatures;
  
    let correctObject = predictedObject;
  
    if (!isCorrect) {
      // Є лише 2 класи, тому правильний об'єкт – це той, який не був обраний
      correctObject = predictedObject === object1Name ? object2Name : object1Name;
    }
  
    // Навчання у будь-якому випадку
    updateFeatures(unknownFeatures, correctObject);
  
    // Очищуємо поле для нового введення
    setUnknownFeaturesInput('');
    setRecognitionResult(null);
  };
  

  // Оновлення ознак при правильному висновку
  
  const updateFeatures = (unknownFeatures, correctObject) => {
    const unknownSet = new Set(unknownFeatures);
  
    // Всі ознаки інших об'єктів
    const otherObject = correctObject === object1Name ? object2Name : object1Name;
    const correctFeatures = correctObject === object1Name ? object1Features : object2Features;
    const otherFeatures = correctObject === object1Name ? object2Features : object1Features;
  
    let newFeaturesAdded = [];
  
    unknownSet.forEach(f => {
      if (!correctFeatures.has(f) && !commonFeatures.has(f)) {
        if (otherFeatures.has(f)) {
          // якщо ознака є у іншого об'єкта → переносимо у спільні ознаки
          otherFeatures.delete(f);
          setCommonFeatures(prev => new Set([...prev, f]));
        } else {
          correctFeatures.add(f);
          newFeaturesAdded.push(f);
        }
      }
    });
  
    addNotification(
      newFeaturesAdded.length > 0
        ? `Додано нові ознаки до ${correctObject}: ${newFeaturesAdded.join(', ')}`
        : 'Всі ознаки вже існували або перенесені у спільні ознаки.',
      'success'
    );
  
    saveData();
    setUnknownFeaturesInput('');
    setRecognitionResult(null);
  };
  

  // Самонавчання при помилковому висновку
  const handleSelfLearning = () => {
    setShowCorrection(false);
    
    const unknownSet = new Set(recognitionResult.unknownFeatures);
    let newFeaturesAdded = [];
    let conflictingFeaturesMoved = [];
    
    if (selectedCorrection === object1Name) {
      const allExisting = new Set([...object1Features, ...commonFeatures, ...object2Features]);
      const newFeatures = new Set([...unknownSet].filter(f => !allExisting.has(f)));
      const conflictingFeatures = new Set([...unknownSet].filter(f => object2Features.has(f)));
      
      if (newFeatures.size > 0) {
        setObject1Features(prev => new Set([...prev, ...newFeatures]));
        newFeaturesAdded = Array.from(newFeatures);
      }
      
      if (conflictingFeatures.size > 0) {
        setObject2Features(prev => {
          const updated = new Set(prev);
          conflictingFeatures.forEach(f => updated.delete(f));
          return updated;
        });
        setCommonFeatures(prev => new Set([...prev, ...conflictingFeatures]));
        conflictingFeaturesMoved = Array.from(conflictingFeatures);
      }
    } else if (selectedCorrection === object2Name) {
      const allExisting = new Set([...object2Features, ...commonFeatures, ...object1Features]);
      const newFeatures = new Set([...unknownSet].filter(f => !allExisting.has(f)));
      const conflictingFeatures = new Set([...unknownSet].filter(f => object1Features.has(f)));
      
      if (newFeatures.size > 0) {
        setObject2Features(prev => new Set([...prev, ...newFeatures]));
        newFeaturesAdded = Array.from(newFeatures);
      }
      
      if (conflictingFeatures.size > 0) {
        setObject1Features(prev => {
          const updated = new Set(prev);
          conflictingFeatures.forEach(f => updated.delete(f));
          return updated;
        });
        setCommonFeatures(prev => new Set([...prev, ...conflictingFeatures]));
        conflictingFeaturesMoved = Array.from(conflictingFeatures);
      }
    }
    
    let message = `Самонавчання завершено для об'єкта: ${selectedCorrection}\n`;
    if (newFeaturesAdded.length > 0) {
      message += `Додано нові ознаки: ${newFeaturesAdded.join(', ')}\n`;
    }
    if (conflictingFeaturesMoved.length > 0) {
      message += `Конфліктні ознаки переміщено до спільних: ${conflictingFeaturesMoved.join(', ')}\n`;
    }
    if (newFeaturesAdded.length === 0 && conflictingFeaturesMoved.length === 0) {
      message += 'Всі ознаки вже існували в базі знань. Зміни не внесено.';
    }
    
    addNotification(message, 'success');
    saveData();
    setUnknownFeaturesInput('');
    setRecognitionResult(null);
  };

  // Скидання системи
  const resetSystem = () => {
    setObject1Name('');
    setObject2Name('');
    setObject1Features(new Set());
    setObject2Features(new Set());
    setCommonFeatures(new Set());
    setTrained(false);
    setCurrentStep('training');
    setTrainingStep(1);
    setObj1Input('');
    setObj2Input('');
    setObj1FeaturesInput('');
    setObj2FeaturesInput('');
    setUnknownFeaturesInput('');
    setRecognitionResult(null);
    setShowConfirmation(false);
    setShowCorrection(false);
    setDuplicateWarnings([]);
    localStorage.removeItem('objectRecognitionData');
    addNotification('Систему скинуто до початкового стану', 'info');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
            <Brain className="text-blue-600" size={40} />
            Система розпізнавання об'єктів
          </h1>
          <p className="text-gray-600">з функцією самонавчання</p>
        </div>

        {/* Повідомлення */}
        <div className="fixed top-4 right-4 space-y-2 z-50">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg shadow-lg max-w-sm ${
                notification.type === 'success' ? 'bg-green-500 text-white' :
                notification.type === 'error' ? 'bg-red-500 text-white' :
                notification.type === 'warning' ? 'bg-yellow-500 text-white' :
                'bg-blue-500 text-white'
              }`}
            >
              {notification.message}
            </div>
          ))}
        </div>

        {/* Попередження про дублікати */}
        {duplicateWarnings.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="text-yellow-600" size={20} />
              <h3 className="font-semibold text-yellow-800">Виявлено проблеми:</h3>
            </div>
            {duplicateWarnings.map((warning, index) => (
              <p key={index} className="text-yellow-700 text-sm">{warning}</p>
            ))}
            <button
              onClick={() => setDuplicateWarnings([])}
              className="mt-2 text-yellow-600 hover:text-yellow-800 text-sm underline"
            >
              Закрити
            </button>
          </div>
        )}

        {/* Початкове навчання */}
        {currentStep === 'training' && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Brain className="text-blue-600" size={24} />
              Початкове навчання системи
            </h2>
            
            {trainingStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Назва першого об'єкта:
                  </label>
                  <input
                    type="text"
                    value={obj1Input}
                    onChange={(e) => setObj1Input(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Наприклад: Кіт"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Назва другого об'єкта:
                  </label>
                  <input
                    type="text"
                    value={obj2Input}
                    onChange={(e) => setObj2Input(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Наприклад: Собака"
                  />
                </div>
                
                <button
                  onClick={handleNamesSubmit}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Далі: Ввести ознаки
                </button>
              </div>
            )}
            
            {trainingStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ознаки для "{object1Name}" (по одній в рядку):
                  </label>
                  <textarea
                    value={obj1FeaturesInput}
                    onChange={(e) => setObj1FeaturesInput(e.target.value)}
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="пухнастий&#10;мяукає&#10;має вуса"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ознаки для "{object2Name}" (по одній в рядку):
                  </label>
                  <textarea
                    value={obj2FeaturesInput}
                    onChange={(e) => setObj2FeaturesInput(e.target.value)}
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="гавкає&#10;віляє хвостом&#10;охороняє дім"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setTrainingStep(1)}
                    className="flex-1 bg-gray-500 text-white py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Назад
                  </button>
                  <button
                    onClick={handleFeaturesSubmit}
                    className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Навчити систему
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Головне вікно (після навчання) */}
        {currentStep === 'recognition' && trained && (
          <>
            {/* База знань */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">База знань</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">{object1Name}:</span>{' '}
                  {object1Features.size > 0 ? Array.from(object1Features).sort().join(', ') : 'немає унікальних ознак'}
                </div>
                <div>
                  <span className="font-medium">{object2Name}:</span>{' '}
                  {object2Features.size > 0 ? Array.from(object2Features).sort().join(', ') : 'немає унікальних ознак'}
                </div>
                <div>
                  <span className="font-medium">Спільні ознаки:</span>{' '}
                  {commonFeatures.size > 0 ? Array.from(commonFeatures).sort().join(', ') : 'немає'}
                </div>
              </div>
            </div>

            {/* Розпізнавання */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Eye className="text-green-600" size={24} />
                Розпізнавання невідомого об'єкта
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Введіть ознаки невідомого об'єкта (по одній в рядку):
                  </label>
                  <textarea
                    value={unknownFeaturesInput}
                    onChange={(e) => setUnknownFeaturesInput(e.target.value)}
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="великий&#10;коричневий&#10;гавкає"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleRecognition}
                    className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye size={20} />
                    Розпізнати
                  </button>
                  <button
                    onClick={() => {
                      setUnknownFeaturesInput('');
                      setRecognitionResult(null);
                    }}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Очистити
                  </button>
                </div>
              </div>
            </div>

            {/* Результат розпізнавання */}
            {recognitionResult && !showConfirmation && !showCorrection && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Результат розпізнавання</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-bold text-lg text-blue-600 mb-2">
                    ВИСНОВОК: Це "{recognitionResult.predictedObject}"
                  </p>
                  <p className="text-gray-600 mb-3">Причина: {recognitionResult.reason}</p>
                  <div className="text-sm text-gray-700 whitespace-pre-line">
                    {recognitionResult.analysis}
                  </div>
                </div>
              </div>
            )}

            {/* Кнопки управління */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={resetSystem}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <RotateCcw size={20} />
                Нове навчання
              </button>
              <button
                onClick={saveData}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save size={20} />
                Зберегти базу
              </button>
            </div>
          </>
        )}

        {/* Модальне вікно підтвердження */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Підтвердження результату</h3>
              <div className="mb-4">
                <p className="mb-2">
                  <strong>Система вважає, що це:</strong> {recognitionResult?.predictedObject}
                </p>
                <p className="text-gray-600 text-sm">
                  <strong>Причина:</strong> {recognitionResult?.reason}
                </p>
              </div>
              <p className="mb-6">Чи правильний цей висновок?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleConfirmation(true)}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Check size={20} />
                  Так
                </button>
                <button
                  onClick={() => handleConfirmation(false)}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <X size={20} />
                  Ні
                </button>
              </div>
            </div>
          </div>
        )}

       
      </div>
    </div>
  );
};

export default ObjectRecognitionSystem;