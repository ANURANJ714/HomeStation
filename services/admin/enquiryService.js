import EnquirySubject from '../../models/EnquirySubject.js';
import EnquiryMessage from '../../models/EnquiryMessage.js';

export const getPaginatedEnquiries = async (filterData) => {
    try {
        const { search, status, page, limit } = filterData;

        const queryFilter = {};

        if (status) {
            if (status === 'ticket_raised') queryFilter.ticketStatus = 'Ticket Raised';
            if (status === 'pending') queryFilter.ticketStatus = 'Pending';
            if (status === 'resolved') queryFilter.ticketStatus = 'Resolved';
        }

        if (search) {
            queryFilter.ticketId = { $regex: search, $options: 'i' };
        }

        const totalItems = await EnquiryMessage.countDocuments(queryFilter);
        const totalPages = Math.ceil(totalItems / limit);
        const skipOffset = (page - 1) * limit;

        const enquiries = await EnquiryMessage.find(queryFilter)
            .populate('subjectId')
            .sort({ createdAt: -1 })
            .skip(skipOffset)
            .limit(limit)
            .lean();

        const activeSubjects = await EnquirySubject.find({ isDeleted: false }).sort({ name: 1 }).lean();

        return {
            enquiries,
            subjects: activeSubjects,
            totalItems,
            totalPages,
            currentPage: page,
            startIndex: totalItems === 0 ? 0 : skipOffset + 1,
            endIndex: Math.min(skipOffset + limit, totalItems)
        };
    } catch (error) {
        throw new Error(`Database transaction failed inside Enquiry Service Layer: ${error.message}`);
    }
};

export const createEnquirySubject = async (subjectData) => {
    try {
        const { name, needAuth } = subjectData;

        const subjectExists = await EnquirySubject.findOne({
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
        });

        if (subjectExists) {
            return { 
                success: false, 
                reason: 'DUPLICATE', 
                message: `The subject "${name}" already exists.` 
            };
        }

        const newSubject = new EnquirySubject({
            name: name.trim(),
            needAuth: needAuth === true || needAuth === 'true'
        });

        await newSubject.save();
        return { success: true, message: "New subject added successfully!" };

    } catch (error) {
        throw new Error(`Service Layer error while saving enquiry subject: ${error.message}`);
    }
};

export const deleteEnquirySubject = async (subjectId) => {
    try {
        const subject = await EnquirySubject.findOne({ _id: subjectId, isDeleted: false });
        if (!subject) {
            return { success: false, message: "The selected subject could not be found or was already deleted." };
        }

        const hasLinkedTickets = await EnquiryMessage.exists({ subjectId });
        if (hasLinkedTickets) {
            return { 
                success: false, 
                message: "This subject is currently linked to active help tickets and cannot be removed." 
            };
        }

        subject.isDeleted = true;
        await subject.save();

        return { success: true, message: "Enquiry subject was successfully removed." };
    } catch (error) {
        throw new Error(`Service Layer failure handling soft-deletion workflow: ${error.message}`);
    }
};