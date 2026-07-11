import { CHALLENGE_TYPES } from '../constants/challengeConstants';

export const CHALLENGE_CATALOG = [
  { id: 'object_toothbrush', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'toothbrush', title: 'Find your toothbrush', instruction: 'Take a clear photo of a toothbrush.', difficulty: 1, isActive: true },
  { id: 'object_water_cup', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'water_cup', title: 'Find a water cup', instruction: 'Take a clear photo of a water cup.', difficulty: 1, isActive: true },
  { id: 'object_book', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'book', title: 'Find a book', instruction: 'Take a clear photo of a book.', difficulty: 1, isActive: true },
  { id: 'object_laptop', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'laptop', title: 'Find a laptop', instruction: 'Take a clear photo of a laptop.', difficulty: 2, isActive: true },
  { id: 'object_shoes', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'shoes', title: 'Find your shoes', instruction: 'Take a clear photo of your shoes.', difficulty: 1, isActive: true },
  { id: 'object_keys', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'keys', title: 'Find your keys', instruction: 'Take a clear photo of your keys.', difficulty: 2, isActive: true },
  { id: 'object_student_card', type: CHALLENGE_TYPES.OBJECT_PROOF, targetKey: 'student_card', title: 'Find your student card', instruction: 'Take a clear photo of your student card.', difficulty: 2, isActive: true },
  { id: 'location_bathroom_mirror', type: CHALLENGE_TYPES.LOCATION_PROOF, targetKey: 'bathroom_mirror', title: 'Go to a bathroom mirror', instruction: 'Take a clear photo of the bathroom mirror.', difficulty: 2, isActive: true },
  { id: 'location_study_desk', type: CHALLENGE_TYPES.LOCATION_PROOF, targetKey: 'study_desk', title: 'Go to your study desk', instruction: 'Take a clear photo of your study desk.', difficulty: 1, isActive: true },
  { id: 'location_room_door', type: CHALLENGE_TYPES.LOCATION_PROOF, targetKey: 'room_door', title: 'Go to your room door', instruction: 'Take a clear photo of your room door.', difficulty: 1, isActive: true },
  { id: 'location_sink_area', type: CHALLENGE_TYPES.LOCATION_PROOF, targetKey: 'sink_area', title: 'Go to a sink', instruction: 'Take a clear photo of the sink area.', difficulty: 2, isActive: true },
  { id: 'location_shoe_area', type: CHALLENGE_TYPES.LOCATION_PROOF, targetKey: 'shoe_area', title: 'Go to your shoe area', instruction: 'Take a clear photo of where your shoes are kept.', difficulty: 1, isActive: true },
];
