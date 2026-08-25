import os
import pickle
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, r2_score

def train():
    print("Starting E20Wise model training...")
    
    # 1. Load dataset
    data_path = 'data/e20wise_vehicle_dataset.csv'
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset not found at {data_path}")
        
    df = pd.read_csv(data_path)
    print(f"Loaded dataset with {len(df)} rows.")
    
    # 2. Preprocessing
    # Define features and target
    feature_cols = [
        'vehicle_model', 'vehicle_year', 'engine_cc', 'transmission_type',
        'odometer_km', 'current_mileage', 'daily_distance_km',
        'city_driving_percent', 'highway_driving_percent', 'driving_style',
        'ac_usage_percent', 'traffic_level', 'region'
    ]
    
    target_col = 'e20_mileage'
    
    # Extract features and targets
    X = df[feature_cols].copy()
    y = df[target_col].copy()
    
    # We will also train a model to predict user_reported_e20_mileage to simulate crowdsourced data variability
    y_user = df['user_reported_e20_mileage'].copy()
    
    # Encode categorical features
    categorical_cols = ['vehicle_model', 'transmission_type', 'driving_style', 'traffic_level', 'region']
    encoders = {}
    
    for col in categorical_cols:
        le = LabelEncoder()
        X[col] = le.fit_transform(X[col].astype(str))
        encoders[col] = le
        print(f"Encoded {col} with {len(le.classes_)} classes.")
        
    # Split the dataset
    X_train, X_test, y_train, y_test, y_user_train, y_user_test = train_test_split(
        X, y, y_user, test_size=0.2, random_state=42
    )
    
    # 3. Train models
    print("Training RandomForestRegressor for predicted E20 mileage...")
    model_e20 = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    model_e20.fit(X_train, y_train)
    
    y_pred = model_e20.predict(X_test)
    r2_e20 = r2_score(y_test, y_pred)
    mae_e20 = mean_absolute_error(y_test, y_pred)
    print(f"Model E20 Mileage - R2 Score: {r2_e20:.4f}, MAE: {mae_e20:.4f}")
    
    print("Training RandomForestRegressor for User Reported E20 mileage...")
    model_user = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    model_user.fit(X_train, y_user_train)
    
    y_user_pred = model_user.predict(X_test)
    r2_user = r2_score(y_user_test, y_user_pred)
    mae_user = mean_absolute_error(y_user_test, y_user_pred)
    print(f"Model User Reported Mileage - R2 Score: {r2_user:.4f}, MAE: {mae_user:.4f}")
    
    # 4. Save model and encoders
    os.makedirs('models', exist_ok=True)
    model_data = {
        'model_e20': model_e20,
        'model_user': model_user,
        'encoders': encoders,
        'feature_cols': feature_cols,
        'categorical_cols': categorical_cols
    }
    
    model_file = 'models/e20wise_model.pkl'
    with open(model_file, 'wb') as f:
        pickle.dump(model_data, f)
        
    print(f"Successfully saved trained model and encoders to {model_file}")

if __name__ == '__main__':
    train()