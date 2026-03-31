import { useState } from 'react';

export default function EntryForm({ placeId, onAddEntry }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'General',
    rating: '5',
    visitDate: new Date().toISOString().split('T')[0]
  });
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const categories = ['General', 'Restaurant', 'Museum', 'Park', 'Landmark', 'Hotel', 'Event', 'Other'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) return;
    
    setSubmitting(true);
    
    // Construct multipart form data for file upload!
    const submitData = new FormData();
    submitData.append('title', formData.title);
    submitData.append('description', formData.description);
    submitData.append('category', formData.category);
    submitData.append('rating', formData.rating);
    submitData.append('visitDate', new Date(formData.visitDate).toISOString());
    
    if (imageFile) {
        submitData.append('image', imageFile);
    }
    
    await onAddEntry(submitData);
    setSubmitting(false);
  };

  return (
    <div className="glass-pane mt-2 mb-2 p-2 form-container">
      <h3 className="form-title">New Entry</h3>
      <form onSubmit={handleSubmit} className="entry-form">
        <div className="form-row">
            <div className="form-group flex-2">
            <label>Title</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} required placeholder="e.g. Delicious dinner at L'As du Fallafel" />
            </div>
            <div className="form-group flex-1">
            <label>Category</label>
            <select name="category" value={formData.category} onChange={handleChange}>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            </div>
        </div>
        
        <div className="form-row">
            <div className="form-group flex-1">
            <label>Rating</label>
            <select name="rating" value={formData.rating} onChange={handleChange}>
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Very Good</option>
                <option value="3">3 - Good</option>
                <option value="2">2 - Fair</option>
                <option value="1">1 - Poor</option>
            </select>
            </div>
            <div className="form-group flex-1">
            <label>Date</label>
            <input type="date" name="visitDate" value={formData.visitDate} onChange={handleChange} required />
            </div>
        </div>

        <div className="form-group">
            <label>Photo Upload</label>
            <input type="file" accept="image/*" onChange={handleFileChange} className="file-input" />
        </div>

        <div className="form-group">
          <label>Memory / Notes</label>
          <textarea 
            name="description" 
            value={formData.description} 
            onChange={handleChange} 
            placeholder="Write your notes here..."
            rows="4"
          />
        </div>

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save Entry'}
        </button>
      </form>
    </div>
  );
}
