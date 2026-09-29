import sys
import numpy as np
import xgboost as xgb
from sklearn.base import BaseEstimator, ClassifierMixin

TARGET_CLASSES = ["Low Risk", "Medium Risk", "High Risk", "Critical Risk"]

class XGBoostRiskClassifier(BaseEstimator, ClassifierMixin):
    """
    Production-grade XGBoost Multi-Class Classifier for Road Infrastructure Risk.
    Maps string class labels to deterministic integer targets and outputs calibrated probability distributions.
    """
    def __init__(
        self,
        n_estimators: int = 200,
        learning_rate: float = 0.06,
        max_depth: int = 5,
        subsample: float = 0.85,
        colsample_bytree: float = 0.85,
        gamma: float = 0.1,
        reg_alpha: float = 0.1,
        reg_lambda: float = 1.0,
        random_state: int = 42
    ):
        self.n_estimators = n_estimators
        self.learning_rate = learning_rate
        self.max_depth = max_depth
        self.subsample = subsample
        self.colsample_bytree = colsample_bytree
        self.gamma = gamma
        self.reg_alpha = reg_alpha
        self.reg_lambda = reg_lambda
        self.random_state = random_state
        self.classes_ = np.array(TARGET_CLASSES)
        self.class_to_idx = {cls: idx for idx, cls in enumerate(TARGET_CLASSES)}
        self.model_ = None

    def fit(self, X, y):
        y_int = np.array([self.class_to_idx.get(str(label), 0) for label in y])
        self.model_ = xgb.XGBClassifier(
            n_estimators=self.n_estimators,
            learning_rate=self.learning_rate,
            max_depth=self.max_depth,
            subsample=self.subsample,
            colsample_bytree=self.colsample_bytree,
            gamma=self.gamma,
            reg_alpha=self.reg_alpha,
            reg_lambda=self.reg_lambda,
            objective="multi:softprob",
            eval_metric="mlogloss",
            random_state=self.random_state,
            n_jobs=-1
        )
        self.model_.fit(X, y_int)
        self.feature_importances_ = self.model_.feature_importances_
        return self

    def predict(self, X):
        y_int = self.model_.predict(X)
        return self.classes_[y_int]

    def predict_proba(self, X):
        return self.model_.predict_proba(X)

# Register module aliases for pickle deserialization across execution contexts
_cur_module = sys.modules[__name__]
sys.modules.setdefault("app.ml.xgb_model", _cur_module)
sys.modules.setdefault("backend.app.ml.xgb_model", _cur_module)
sys.modules.setdefault("ml.xgb_model", _cur_module)
