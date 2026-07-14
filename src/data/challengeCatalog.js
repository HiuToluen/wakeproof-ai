import { CHALLENGE_TYPES } from '../constants/challengeConstants';

export const DEMO_OBJECT_CHALLENGES = [
  { id: 'demo_object_table', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'table', label: 'Bàn', title: 'Tìm một cái bàn', instruction: 'Chụp ảnh rõ ràng của một cái bàn.', difficulty: 1, isActive: true },
  { id: 'demo_object_chair', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'chair', label: 'Ghế', title: 'Tìm một cái ghế', instruction: 'Chụp ảnh rõ ràng của một cái ghế.', difficulty: 1, isActive: true },
  { id: 'demo_object_laptop', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'laptop', label: 'Laptop', title: 'Tìm một chiếc laptop', instruction: 'Chụp ảnh rõ ràng của một chiếc laptop.', difficulty: 1, isActive: true },
  { id: 'demo_object_computer_mouse', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'computer_mouse', label: 'Chuột máy tính', title: 'Tìm một con chuột máy tính', instruction: 'Chụp ảnh rõ ràng của một con chuột máy tính.', difficulty: 1, isActive: true },
  { id: 'demo_object_smartphone', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'smartphone', label: 'Điện thoại', title: 'Tìm một chiếc điện thoại', instruction: 'Chụp ảnh rõ ràng của một chiếc điện thoại.', difficulty: 1, isActive: true },
  { id: 'demo_object_water_bottle', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'water_bottle', label: 'Chai nước', title: 'Tìm một chai nước', instruction: 'Chụp ảnh rõ ràng của một chai nước.', difficulty: 1, isActive: true },
];

export function getRandomDemoObjectChallenge(previousChallengeId) {
  const alternatives = previousChallengeId ? DEMO_OBJECT_CHALLENGES.filter((challenge) => challenge.id !== previousChallengeId) : DEMO_OBJECT_CHALLENGES;
  const candidates = alternatives.length > 0 ? alternatives : DEMO_OBJECT_CHALLENGES;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export const CHALLENGE_CATALOG = [
  { id: 'object_toothbrush', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'toothbrush', title: 'Find your toothbrush', instruction: 'Take a clear photo of a toothbrush.', difficulty: 1, isActive: true },
  { id: 'object_water_cup', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'water_cup', title: 'Find a water cup', instruction: 'Take a clear photo of a water cup.', difficulty: 1, isActive: true },
  { id: 'object_book', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'book', title: 'Find a book', instruction: 'Take a clear photo of a book.', difficulty: 1, isActive: true },
  { id: 'object_laptop', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'laptop', title: 'Find a laptop', instruction: 'Take a clear photo of a laptop.', difficulty: 2, isActive: true },
  { id: 'object_shoes', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'shoes', title: 'Find your shoes', instruction: 'Take a clear photo of your shoes.', difficulty: 1, isActive: true },
  { id: 'object_keys', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'keys', title: 'Find your keys', instruction: 'Take a clear photo of your keys.', difficulty: 2, isActive: true },
  { id: 'object_student_card', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'student_card', title: 'Find your student card', instruction: 'Take a clear photo of your student card.', difficulty: 2, isActive: true },
  { id: 'object_phone_charger', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'phone_charger', title: 'Find a phone charger', instruction: 'Take a clear photo of a phone charger.', difficulty: 1, isActive: true },
  { id: 'object_backpack', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'backpack', title: 'Find a backpack', instruction: 'Take a clear photo of a backpack.', difficulty: 1, isActive: true },
  { id: 'object_spoon', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'spoon', title: 'Find a spoon', instruction: 'Take a clear photo of a spoon.', difficulty: 1, isActive: true },
  { id: 'object_bottle', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'bottle', title: 'Find a bottle', instruction: 'Take a clear photo of a bottle.', difficulty: 1, isActive: true },
  { id: 'object_towel', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'towel', title: 'Find a towel', instruction: 'Take a clear photo of a towel.', difficulty: 1, isActive: true },
  { id: 'object_headphones', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'headphones', title: 'Find headphones', instruction: 'Take a clear photo of headphones.', difficulty: 1, isActive: true },
  { id: 'object_notebook', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'notebook', title: 'Find a notebook', instruction: 'Take a clear photo of a notebook.', difficulty: 1, isActive: true },
  { id: 'object_chair', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'chair', title: 'Find a chair', instruction: 'Take a clear photo of a chair.', difficulty: 1, isActive: true },
  { id: 'location_bathroom_mirror', type: CHALLENGE_TYPES.LOCATION_PROOF, targetKey: 'bathroom_mirror', title: 'Go to a bathroom mirror', instruction: 'Take a clear photo of the bathroom mirror.', difficulty: 2, isActive: true },
  { id: 'location_study_desk', type: CHALLENGE_TYPES.LOCATION_PROOF, targetKey: 'study_desk', title: 'Go to your study desk', instruction: 'Take a clear photo of your study desk.', difficulty: 1, isActive: true },
  { id: 'location_room_door', type: CHALLENGE_TYPES.LOCATION_PROOF, targetKey: 'room_door', title: 'Go to your room door', instruction: 'Take a clear photo of your room door.', difficulty: 1, isActive: true },
  { id: 'location_sink_area', type: CHALLENGE_TYPES.LOCATION_PROOF, targetKey: 'sink_area', title: 'Go to a sink', instruction: 'Take a clear photo of the sink area.', difficulty: 2, isActive: true },
  { id: 'location_shoe_area', type: CHALLENGE_TYPES.LOCATION_PROOF, targetKey: 'shoe_area', title: 'Go to your shoe area', instruction: 'Take a clear photo of where your shoes are kept.', difficulty: 1, isActive: true },
  { id: 'location_kitchen_area', type: CHALLENGE_TYPES.LOCATION_PROOF, targetKey: 'kitchen_area', title: 'Go to the kitchen', instruction: 'Take a clear photo of the kitchen area.', difficulty: 2, isActive: true },
  { id: 'location_bathroom_entrance', type: CHALLENGE_TYPES.LOCATION_PROOF, targetKey: 'bathroom_entrance', title: 'Go to the bathroom entrance', instruction: 'Take a clear photo from the bathroom entrance.', difficulty: 2, isActive: true },
  { id: 'location_window_area', type: CHALLENGE_TYPES.LOCATION_PROOF, targetKey: 'window_area', title: 'Go to a window', instruction: 'Take a clear photo of a window area.', difficulty: 1, isActive: true },
  { id: 'location_living_room', type: CHALLENGE_TYPES.LOCATION_PROOF, targetKey: 'living_room', title: 'Go to the living room', instruction: 'Take a clear photo of the living room.', difficulty: 2, isActive: true },
  { id: 'location_refrigerator_area', type: CHALLENGE_TYPES.LOCATION_PROOF, targetKey: 'refrigerator_area', title: 'Go to the refrigerator', instruction: 'Take a clear photo of the refrigerator area.', difficulty: 2, isActive: true },
  { id: 'location_self_in_front_of_mirror', type: CHALLENGE_TYPES.LOCATION_PROOF, targetKey: 'self_in_front_of_mirror', title: 'Stand in front of a mirror', instruction: 'Take a clear photo showing you in front of a mirror.', difficulty: 2, isActive: true },
  { id: 'location_self_near_study_desk', type: CHALLENGE_TYPES.LOCATION_PROOF, targetKey: 'self_near_study_desk', title: 'Stand near your study desk', instruction: 'Take a clear photo showing you near your study desk.', difficulty: 2, isActive: true },
  { id: 'location_self_near_room_door', type: CHALLENGE_TYPES.LOCATION_PROOF, targetKey: 'self_near_room_door', title: 'Stand near your room door', instruction: 'Take a clear photo showing you near your room door.', difficulty: 2, isActive: true },
];
