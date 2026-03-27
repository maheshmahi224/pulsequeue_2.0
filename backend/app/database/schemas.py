from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid

def utcnow():
    return datetime.now(timezone.utc)

def gen_id():
    return str(uuid.uuid4())

class PriorityEnum(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class GenderEnum(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"

class Vitals(BaseModel):
    bp_systolic: Optional[float] = None
    bp_diastolic: Optional[float] = None
    blood_sugar: Optional[float] = None
    temperature: Optional[float] = None
    pulse: Optional[float] = None
    oxygen: Optional[float] = None

    @field_validator("bp_systolic")
    @classmethod
    def val_bp_sys(cls, v):
        if v is not None and not (70 <= v <= 250):
            raise ValueError("Systolic BP must be 70–250")
        return v

    @field_validator("bp_diastolic")
    @classmethod
    def val_bp_dia(cls, v):
        if v is not None and not (40 <= v <= 150):
            raise ValueError("Diastolic BP must be 40–150")
        return v

    @field_validator("blood_sugar")
    @classmethod
    def val_sugar(cls, v):
        if v is not None and not (40 <= v <= 500):
            raise ValueError("Blood sugar must be 40–500")
        return v

    @field_validator("pulse")
    @classmethod
    def val_pulse(cls, v):
        if v is not None and not (30 <= v <= 220):
            raise ValueError("Pulse must be 30–220")
        return v

    @field_validator("temperature")
    @classmethod
    def val_temp(cls, v):
        if v is not None and not (90 <= v <= 110):
            raise ValueError("Temperature must be 90–110 F")
        return v

    @field_validator("oxygen")
    @classmethod
    def val_oxygen(cls, v):
        if v is not None and not (50 <= v <= 100):
            raise ValueError("Oxygen must be 50–100%")
        return v

class MedicalHistory(BaseModel):
    diabetes: bool = False
    hypertension: bool = False
    heart_disease: bool = False
    asthma: bool = False

class EmergencyFlags(BaseModel):
    chest_pain: bool = False
    breathing_difficulty: bool = False
    loss_of_consciousness: bool = False

class PatientSchema(BaseModel):
    patient_id: str = Field(default_factory=gen_id)
    name: str
    age: int
    gender: GenderEnum
    phone: str
    email: Optional[str] = None
    password_hash: Optional[str] = None
    medical_history: MedicalHistory = Field(default_factory=MedicalHistory)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    @field_validator("age")
    @classmethod
    def val_age(cls, v):
        if not (0 < v < 120):
            raise ValueError("Age must be 1–119")
        return v

class DiseaseResult(BaseModel):
    name: str
    confidence: float

class AIReasoning(BaseModel):
    risk_reason: str = ""
    supporting_factors: List[str] = []
    sources: List[str] = []

class ReportSchema(BaseModel):
    report_id: str = Field(default_factory=gen_id)
    patient_id: str
    symptoms: str
    vitals: Vitals = Field(default_factory=Vitals)
    medical_history: MedicalHistory = Field(default_factory=MedicalHistory)
    emergency_flags: EmergencyFlags = Field(default_factory=EmergencyFlags)
    prediction: List[DiseaseResult] = []
    risk_score: float = 0.0
    priority: PriorityEnum = PriorityEnum.MEDIUM
    ai_reasoning: AIReasoning = Field(default_factory=AIReasoning)
    status: str = "pending"
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

class QueueSchema(BaseModel):
    patient_id: str
    report_id: str
    priority: PriorityEnum = PriorityEnum.MEDIUM
    priority_weight: int = 2
    risk_score: float = 0.0
    queue_position: int = 0
    arrival_time: datetime = Field(default_factory=utcnow)
    last_updated: datetime = Field(default_factory=utcnow)
    status: str = "waiting"

class DoctorSchema(BaseModel):
    doctor_id: str = Field(default_factory=gen_id)
    name: str
    department: str
    email: str
    password_hash: Optional[str] = None
    role: str = "doctor"
    created_at: datetime = Field(default_factory=utcnow)

class NoteSchema(BaseModel):
    note_id: str = Field(default_factory=gen_id)
    patient_id: str
    report_id: str
    doctor_id: str
    doctor_name: str = ""
    message: str
    priority_change: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)
